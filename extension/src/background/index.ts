import { checkedTier, ensureValidSession, generateViaBackend, handleGoogleSignIn, limitErrorCode, RateLimitError, saveLetterToBackend, tailorViaBackend } from '../lib/auth'
import { generateCoverLetter } from '../lib/ai'
import { parseResumeStructure } from '../lib/ai/resume-parse'
import { tailorResume } from '../lib/ai/resume-tailor'
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../lib/config'
import { decryptApiKey } from '../lib/crypto'
import { checkUploadedDesign, designForTailor, finishDesign, parseForTailor, uploadDesignIfPro } from '../lib/design'
import { debugGroup } from '../lib/debug'
import { addToHistory, addToTailoredHistory, getCandidateContext, getResume, getSession, getSettings, hasAgreedToPageRead, resolveMode, setEntryAccounts, watchSession } from '../lib/storage'
import { handleInstalled, uninstallUrl } from './install'
import { DELETE_PORT, handleDeletePort } from './delete'
import { savePendingUpdate } from '../lib/update'
import { handleAnswerClick, registerAnswerMenu, writeAnswer, type AnswerRequest } from './answer'
import { scrapeFailure } from './scrape-failure'
import { acceptsMessage } from './sender'
import { bestJob, CONTENT_SCRIPT_FILE, listScrapableFrames, previewTab, readFrames, topFrameUrl, withServerRead, type FrameScrape } from './frames'
import type { CoverJob, CoverLetter, GenerateResponse, JobData, ScrapeFailure, ScrapeResponse, TailoredResume, TailorJob, TailorResponse } from '../types'

chrome.runtime.onInstalled.addListener((details) => {
  void handleInstalled(details)
  registerAnswerMenu()
})

chrome.runtime.onUpdateAvailable.addListener((details) => {
  void savePendingUpdate(details.version)
})

// Right-click "Cover Me: write an answer" (#232). The click grants activeTab
// for that tab, the same access the toolbar button gives.
chrome.contextMenus.onClicked.addListener((info, tab) => {
  void keepAlive(handleAnswerClick(info, tab, scrapeTab, CONTENT_SCRIPT_FILE))
})

function setUninstallUrl(userId?: string) {
  void chrome.runtime.setUninstallURL(uninstallUrl(chrome.runtime.getManifest().version, userId))
}
void getSession().then((session) => setUninstallUrl(session?.user?.id))
watchSession((session) => setUninstallUrl(session?.user?.id))

chrome.runtime.onConnect.addListener((port) => {
  if (port.sender?.url?.startsWith(chrome.runtime.getURL('')) && port.name === DELETE_PORT) handleDeletePort(port)
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!acceptsMessage(message.type, sender)) return
  if (message.type === 'SCRAPE_TAB') {
    handleScrapeTab().then(sendResponse)
    return true
  }
  if (message.type === 'PREVIEW_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true })
      .then(([tab]) => (tab?.id ? previewTab(tab.id) : null))
      .catch(() => null)
      .then(sendResponse)
    return true
  }
  if (message.type === 'GENERATE_FROM_TAB') {
    keepAlive(handleGenerate()).then(sendResponse)
    return true
  }
  if (message.type === 'GENERATE_FROM_MANUAL') {
    keepAlive(handleGenerateManual(message.jobId as string | undefined, message.job as JobData, message.supplemental as string | undefined)).then(sendResponse)
    return true
  }
  if (message.type === 'TAILOR_FROM_TAB') {
    keepAlive(handleTailorFromTab(!!message.compact)).then(sendResponse)
    return true
  }
  if (message.type === 'TAILOR_FROM_MANUAL') {
    keepAlive(handleTailorFromManual(message.jobId as string | undefined, message.job as JobData, !!message.compact, message.supplemental as string | undefined, !!message.trim, message.includeSummary !== false, message.previous as TailoredResume | undefined)).then(sendResponse)
    return true
  }
  if (message.type === 'CHECK_DESIGN') {
    keepAlive(checkUploadedDesign(message.hash as string)).then(() => sendResponse({}))
    return true
  }
  if (message.type === 'ANSWER_REWRITE') {
    keepAlive(writeAnswer(message.request as AnswerRequest)).then(sendResponse)
    return true
  }
  if (message.type === 'GOOGLE_SIGN_IN') {
    keepAlive(handleGoogleSignIn({ productUpdates: message.productUpdates === true })).then(sendResponse)
    return true
  }
})

// Chrome stops a service worker after 30 s with no event or extension API call (#1).
// A letter with a lint retry or a tailor run can outlast that, so ping an API every 20 s.
function keepAlive<T>(work: Promise<T>): Promise<T> {
  const ping = setInterval(() => void chrome.runtime.getPlatformInfo(), 20_000)
  return work.finally(() => clearInterval(ping))
}

// The run's status is stored so it survives the popup closing, and a "cancel"
// there stops watching without stopping the run, which still counts (https://github.com/TheLinc/cover-me/commit/9f4ea308)
async function setCoverJob(rec: CoverJob): Promise<void> {
  await chrome.storage.local.set({ coverJob: rec })
}

async function setTailorJob(rec: TailorJob): Promise<void> {
  await chrome.storage.local.set({ tailorJob: rec })
}

async function failCover(id: string, job: JobData, startedAt: number, error: string): Promise<GenerateResponse> {
  await setCoverJob({ id, status: 'error', job, error, startedAt })
  return { success: false, error }
}

// Best-effort: a failed save must not turn a finished, already counted hosted run into an error (#24).
async function recordTailored(
  job: JobData,
  resume: TailoredResume,
  id: string = crypto.randomUUID(),
  owner?: { account?: string; saveTo?: string },
): Promise<void> {
  await addToTailoredHistory({ id, job, resume, createdAt: new Date().toISOString(), ...owner }).catch(() => {})
}

async function failTailor(id: string, job: JobData, startedAt: number, error: string): Promise<TailorResponse> {
  await setTailorJob({ id, status: 'error', job, error, startedAt })
  return { success: false, error }
}

class ScrapeError extends Error {
  constructor(readonly failure: ScrapeFailure) {
    super(failure.error)
  }
}

// forAnswer: a right-click answer's read (#232), often of an application form
// with no posting on it; the server doesn't count those as failed reads.
async function scrapeTab(tabId: number, { forAnswer = false } = {}): Promise<JobData> {
  const { frameIds, urls } = await listScrapableFrames(tabId)
  const fail = async (error: string, frameId?: number) =>
    new ScrapeError(scrapeFailure(await topFrameUrl(tabId), [...urls.values()], error, frameId === undefined ? undefined : urls.get(frameId)))

  const wantSnapshot = !!SUPABASE_URL && (await hasAgreedToPageRead())
  const results = await preferServerScrapes(await readFrames(tabId, frameIds, wantSnapshot), forAnswer)
  const best = await bestJob(tabId, results)
  if (best) return best

  // Connection errors mean the content script isn't loaded (right after an extension reload), so only
  // deliberate failures carry a site-specific message to show. https://github.com/TheLinc/cover-me/commit/d7700ca5
  const deliberate =
    results.find((r) => !r.ok && !r.connection && r.frameId === 0) ??
    results.find((r) => !r.ok && !r.connection)
  if (deliberate && !deliberate.ok) throw await fail(deliberate.error.message, deliberate.frameId)

  type InlineResult = { title: string; company: string; description: string; url: string; heuristic?: boolean }
  let result: InlineResult | null = null
  let resultFrameId = 0
  try {
    const injections = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: inlineScraper,
    })
    const valid = injections
      .map((i) => ({ frameId: i.frameId, r: i.result as InlineResult | null }))
      .filter((x): x is { frameId: number; r: InlineResult } =>
        !!x.r && typeof x.r === 'object' && 'title' in x.r && 'description' in x.r && x.r.description.length > 200)
    // The top frame can be an empty shell whose heuristic grabs nav text while an iframe holds the real
    // posting, so selector results win in any frame. https://github.com/TheLinc/cover-me/commit/d7700ca5
    valid.sort((a, b) =>
      Number(!!a.r.heuristic) - Number(!!b.r.heuristic) ||
      Number(b.frameId === 0) - Number(a.frameId === 0) ||
      b.r.description.length - a.r.description.length)
    result = valid[0]?.r ?? null
    resultFrameId = valid[0]?.frameId ?? 0
  } catch {
  }

  if (result && result.description.length > 200) {
    const url = resultFrameId === 0 ? result.url : await topFrameUrl(tabId) ?? result.url
    return { title: result.title, company: result.company, description: result.description, url }
  }

  throw await fail('Could not read this page. Try refreshing, or paste the job description manually.')
}

// A board's markup change ships by deploying the scrape function, not a store release. Outdated
// bundled scrapers tend to return a wrong or partial job rather than fail, so the server result wins (#3).
async function preferServerScrapes(results: FrameScrape[], forAnswer = false): Promise<FrameScrape[]> {
  const sent = results.filter((r) => r.snapshot)
  if (!SUPABASE_URL || sent.length === 0) return results
  // Nothing leaves the browser until the user agrees to the page-read notice (#29).
  if (!(await hasAgreedToPageRead())) return results
  try {
    const body = JSON.stringify({ pages: sent.map((r) => r.snapshot), ...(forAnswer ? { answer: true } : {}) })
    const gzipped = await new Response(new Blob([body]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()
    const res = await fetch(`${SUPABASE_URL}/functions/v1/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip', apikey: SUPABASE_PUBLISHABLE_KEY },
      body: gzipped,
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`scrape function returned ${res.status}`)
    const { results: server } = await res.json() as { results: ({ ok: true; job: JobData } | { ok: false; error: string })[] }
    const byFrame = new Map(sent.map((r, i) => [r.frameId, server[i]]))
    await debugGroup('Scrape — server', { frames: sent.length, read: server.filter((s) => s.ok).length })
    return results.map((r) => withServerRead(r, byFrame.get(r.frameId)))
  } catch (err) {
    await debugGroup('Scrape — server unavailable, using bundled scrapers', { error: err instanceof Error ? err.message : String(err) })
    return results
  }
}

// Serialised via .toString() and run in the page, so it must not reference outer-scope variables. https://github.com/TheLinc/cover-me/commit/a074665d
function inlineScraper(): { title: string; company: string; description: string; url: string; heuristic?: boolean } | null {
  const url = location.href

  // querySelector never pierces shadow roots, and LinkedIn's interop shell renders inside them. https://github.com/TheLinc/cover-me/commit/d7700ca5
  const roots: (Document | ShadowRoot)[] = [document]
  const scanRoots = (root: Document | ShadowRoot): void => {
    for (const el of Array.from(root.querySelectorAll('*'))) {
      const sr = (el as HTMLElement).shadowRoot
      if (sr) {
        roots.push(sr)
        scanRoots(sr)
      }
    }
  }
  scanRoots(document)
  const q = (sel: string): HTMLElement | null => {
    for (const r of roots) {
      const el = r.querySelector(sel)
      if (el) return el as HTMLElement
    }
    return null
  }
  const qa = (sel: string): HTMLElement[] =>
    roots.flatMap((r) => Array.from(r.querySelectorAll(sel)) as HTMLElement[])

  const ldScripts = qa('script[type="application/ld+json"]') as HTMLScriptElement[]
  for (const s of ldScripts) {
    try {
      const d = JSON.parse(s.textContent ?? '') as Record<string, unknown>
      if (d['@type'] === 'JobPosting') {
        const title = String(d.title ?? d.name ?? '')
        const org = d.hiringOrganization as Record<string, unknown> | string | undefined
        const company = typeof org === 'object' ? String(org?.name ?? 'Unknown') : String(org ?? 'Unknown')
        const desc = String(d.description ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
        if (title && desc.length > 100) return { title, company, description: desc, url }
      }
    } catch {}
  }

  if (location.hostname.includes('bamboohr.com')) {
    const titleEl = q('[data-fabric-component="Headline"]')
    const descEl = q('.BambooRichText')
    const title = titleEl?.innerText?.trim() ?? ''
    const description = descEl?.innerText?.trim() ?? ''
    const sub = location.hostname.split('.')[0]
    const company = sub
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(/[-_]/)
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
    if (title && description.length > 200) return { title, company, description, url }
  }

  const firstMatch = (sels: string[]): string => {
    for (const s of sels) {
      const t = q(s)?.innerText?.trim()
      if (t) return t
    }
    return ''
  }
  const atsTitle = firstMatch([
    '[data-qa="job-title"]',
    '[class*="job-title"] h1',
    '.job-title',
    '[class*="posting-title"]',
    'h1[class*="title"]',
    'h1',
  ])
  const atsDesc = firstMatch([
    '[data-qa="job-description"]',
    '#job-details',
    '.posting-description',
    '[class*="job-description"]',
    '#content',
  ])
  if (atsTitle && atsDesc.length > 200) {
    return { title: atsTitle, company: 'Unknown Company', description: atsDesc, url }
  }

  // Skip UI chrome headings: LinkedIn's "0 notifications total" toast counter is the first h2. https://github.com/TheLinc/cover-me/commit/d7700ca5
  const plausible = (el: HTMLElement): boolean => {
    const t = el.innerText?.trim()
    return !!t && t.length > 2 && t.length < 120 && !/^\d/.test(t) && !/notification|skip to|menu/i.test(t)
  }
  const h1 = qa('h1').find(plausible) ?? qa('h2').find(plausible)
  const blocks = qa('div, section, article')
    .filter((el) => (el.innerText?.trim().length ?? 0) > 500)
    .sort((a, b) => (b.innerText?.length ?? 0) - (a.innerText?.length ?? 0))
  const hTitle = h1?.innerText?.trim() ?? ''
  const hDesc = blocks[0]?.innerText?.trim() ?? ''
  if (hTitle && hDesc.length > 200) return { title: hTitle, company: 'Unknown Company', description: hDesc, url, heuristic: true }

  return null
}

async function handleScrapeTab(): Promise<ScrapeResponse> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  const tab = tabs[0]
  if (!tab?.id) return { success: false, error: 'Could not access the current tab.' }
  try {
    const job = await scrapeTab(tab.id)
    return { success: true, job }
  } catch (err) {
    if (err instanceof ScrapeError) return { success: false, error: err.message, failure: err.failure }
    return { success: false, error: err instanceof Error ? err.message : 'Could not read this page.' }
  }
}

async function handleGenerate(): Promise<GenerateResponse> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  const tab = tabs[0]
  if (!tab?.id) return { success: false, error: 'Could not access the current tab.' }
  try {
    return generateFromJob(await scrapeTab(tab.id))
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Could not read this page.' }
  }
}

async function handleGenerateManual(jobId: string | undefined, job: JobData, supplemental?: string): Promise<GenerateResponse> {
  return generateFromJob(job, supplemental, jobId)
}

async function handleTailorFromTab(compact: boolean): Promise<TailorResponse> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  const tab = tabs[0]
  if (!tab?.id) return { success: false, error: 'Could not access the current tab.' }
  try {
    return tailorFromJob(await scrapeTab(tab.id), compact)
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Could not read this page.' }
  }
}

async function handleTailorFromManual(jobId: string | undefined, job: JobData, compact: boolean, supplemental?: string, trim = false, includeSummary = true, previous?: TailoredResume): Promise<TailorResponse> {
  return tailorFromJob(job, compact, supplemental, trim, includeSummary, jobId, previous)
}

async function tailorFromJob(job: JobData, compact: boolean, supplemental?: string, trim = false, includeSummary = true, jobId?: string, lastResult?: TailoredResume): Promise<TailorResponse> {
  const id = jobId ?? crypto.randomUUID()
  const startedAt = Date.now()
  await setTailorJob({ id, status: 'loading', job, startedAt })
  // Which file a result came from isn't resume content for the model to revise (#131)
  const { sourceHash: _h, designFellBack: _f, ...previous } = lastResult ?? {} as TailoredResume
  try {
    const settings = await getSettings()

    // "Your design" (#131): the user's file sets the page, so there's no
    // compacting, and no summary when the file has none to rewrite.
    let design = await designForTailor()
    const asked = { compact, includeSummary }
    const fitLayout = () => {
      const yours = design.design.layout === 'yours'
      compact = yours ? false : asked.compact
      includeSummary = yours && !design.summary ? false : asked.includeSummary
    }
    fitLayout()

    const candidateContext = (await getCandidateContext()).trim()
    const merged = [candidateContext, supplemental?.trim()].filter(Boolean).join('\n\n') || undefined
    // A result made with a one-off note holds the user's own input, like an
    // editor edit: marked so the next Regenerate keeps what the note added,
    // even once the note box holds something else (#171). The hosted Pro
    // copy on the server doesn't carry the mark.
    const note = supplemental?.trim() || undefined

    await debugGroup('Tailor — scraped job + flags', {
      mode: resolveMode(settings),
      'job.title': job.title,
      'job.company': job.company,
      'job.url': job.url,
      'job.description': job.description,
      'job.description.length': job.description?.length,
      flags: { compact, trim, includeSummary, layout: design.design.layout, fellBack: design.design.fellBack, hasCandidateContext: !!candidateContext, hasSupplemental: !!supplemental, hasPrevious: !!lastResult },
    })

    let lastProgress = ''
    const onProgress = (progress: string): void => {
      if (progress === lastProgress) return
      lastProgress = progress
      void setTailorJob({ id, status: 'loading', job, startedAt, progress })
    }

    if (resolveMode(settings) === 'hosted') {
      const session = await ensureValidSession()
      if (!session) {
        return failTailor(id, job, startedAt, 'Sign in to your Cover Me account in Settings.')
      }
      const localId = crypto.randomUUID()
      const tier = checkedTier(session)
      const { resume: tailored, savedId } = await tailorViaBackend(job, session.access_token, compact, merged, trim, includeSummary, lastResult && previous, onProgress, localId, design.design)
      const resume = await finishDesign(tailored, design)
      if (note) resume.hasEdits = true
      // Awaited first: uploadDesignIfPro reads the cached tier (#182)
      const pro = (await tier) === 'hosted_pro'
      if (resume.sourceHash) void uploadDesignIfPro(session)
      await recordTailored(job, resume, localId, {
        ...(savedId === localId ? { account: session.user.id } : {}),
        ...(pro ? { saveTo: session.user.id } : {}),
      })
      await setTailorJob({ id, status: 'done', job, resume, startedAt, entryId: localId, note })
      return { success: true, resume, job }
    }

    if (!settings?.apiKey) {
      return failTailor(id, job, startedAt, 'No API key set. Open Settings to add your key.')
    }
    const resumeData = await getResume()
    if (!resumeData?.text) {
      return failTailor(id, job, startedAt, 'No resume uploaded. Open Resume to upload yours.')
    }
    const apiKey = await decryptApiKey(settings.apiKey)

    const before = design
    const read = await parseForTailor(design, resumeData, async () => {
      onProgress('Reading your resume (first run only)…')
      const fresh = await parseResumeStructure(resumeData.text, settings.provider, apiKey)
      onProgress('')
      return fresh
    })
    const parsed = read.parsed
    design = read.design
    if (design !== before) fitLayout()

    await debugGroup('Tailor — parsed resume (BYOK, input to model)', {
      parsed,
      bulletsPerRole: parsed.experience?.map((e) => ({ role: e.title, bullets: e.bullets?.length })),
    })

    const tailored = await finishDesign(await tailorResume(job, parsed, settings.provider, apiKey, compact, merged, trim, includeSummary, lastResult && previous, onProgress), design)
    if (note) tailored.hasEdits = true
    const entryId = crypto.randomUUID()
    await recordTailored(job, tailored, entryId)
    await setTailorJob({ id, status: 'done', job, resume: tailored, startedAt, entryId, note })
    return { success: true, resume: tailored, job }
  } catch (err) {
    if (err instanceof RateLimitError) {
      await setTailorJob({ id, status: 'error', job, error: err.message, errorCode: limitErrorCode(err), startedAt })
      return { success: false, error: err.message, errorCode: limitErrorCode(err) }
    }
    const error = err instanceof Error ? err.message : 'Resume tailoring failed. Please try again.'
    await setTailorJob({ id, status: 'error', job, error, startedAt })
    return { success: false, error }
  }
}

async function generateFromJob(job: JobData, supplemental?: string, jobId?: string): Promise<GenerateResponse> {
  const id = jobId ?? crypto.randomUUID()
  const startedAt = Date.now()
  await setCoverJob({ id, status: 'loading', job, startedAt })
  try {
    const settings = await getSettings()

    const candidateContext = (await getCandidateContext()).trim()
    const merged = [candidateContext, supplemental?.trim()].filter(Boolean).join('\n\n') || undefined

    await debugGroup('Cover letter — scraped job', {
      mode: resolveMode(settings),
      'job.title': job.title,
      'job.company': job.company,
      'job.url': job.url,
      'job.description': job.description,
      'job.description.length': job.description?.length,
      hasCandidateContext: !!candidateContext,
      hasSupplemental: !!supplemental,
    })

    if (resolveMode(settings) === 'hosted') {
      const session = await ensureValidSession()
      if (!session) {
        return failCover(id, job, startedAt, 'Sign in to your Cover Me account in Settings.')
      }
      const [letter, tier] = await Promise.all([generateViaBackend(job, session.access_token, merged), checkedTier(session)])
      const pro = tier === 'hosted_pro'
      const entry: CoverLetter = {
        id: crypto.randomUUID(),
        job,
        letter,
        createdAt: new Date().toISOString(),
        ...(pro ? { saveTo: session.user.id } : {}),
      }
      await addToHistory(entry)
      if (pro) {
        saveLetterToBackend(session.access_token, entry)
          .then(() => setEntryAccounts({ letters: { [entry.id]: session.user.id } }))
          .catch(() => {})
      }
      await setCoverJob({ id, status: 'done', job, letter, createdAt: entry.createdAt, startedAt })
      return { success: true, letter, job }
    }

    if (!settings?.apiKey) {
      return failCover(id, job, startedAt, 'No API key set. Open Settings to add your key.')
    }
    const resume = await getResume()
    if (!resume?.text) {
      return failCover(id, job, startedAt, 'No resume uploaded. Open Resume to upload yours.')
    }

    const apiKey = await decryptApiKey(settings.apiKey)
    const letter = await generateCoverLetter(job, resume.text, settings.provider, apiKey, merged)
    const entry: CoverLetter = {
      id: crypto.randomUUID(),
      job,
      letter,
      createdAt: new Date().toISOString(),
    }
    await addToHistory(entry)
    await setCoverJob({ id, status: 'done', job, letter, createdAt: entry.createdAt, startedAt })
    return { success: true, letter, job }
  } catch (err) {
    if (err instanceof RateLimitError) {
      await setCoverJob({ id, status: 'error', job, error: err.message, errorCode: limitErrorCode(err), startedAt })
      return { success: false, error: err.message, errorCode: limitErrorCode(err) }
    }
    const error = err instanceof Error ? err.message : 'Generation failed. Please try again.'
    await setCoverJob({ id, status: 'error', job, error, startedAt })
    return { success: false, error }
  }
}
