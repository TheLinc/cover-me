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
import { handleAnswerClick, registerAnswerMenu, writeAnswer, type AnswerRequest } from './answer'
import { scrapeFailure } from './scrape-failure'
import type { PageSnapshot } from '../content/snapshot.ts'
import type { CoverJob, CoverLetter, FrameScrapeResponse, GenerateResponse, JobData, ScrapeFailure, ScrapeResponse, TailoredResume, TailorJob, TailorResponse } from '../types'

chrome.runtime.onInstalled.addListener((details) => {
  void handleInstalled(details)
  registerAnswerMenu()
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
  if (port.sender?.id === chrome.runtime.id && port.name === DELETE_PORT) handleDeletePort(port)
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return
  if (message.type === 'SCRAPE_TAB') {
    handleScrapeTab().then(sendResponse)
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
  // Sent by "Use another job" in the answer's status box on the page (#232).
  if (message.type === 'ANSWER_REWRITE') {
    keepAlive(writeAnswer(message.request as AnswerRequest)).then(sendResponse)
    return true
  }
  if (message.type === 'GOOGLE_SIGN_IN') {
    keepAlive(handleGoogleSignIn({ productUpdates: message.productUpdates === true })).then(sendResponse)
    return true
  }
})

// Chrome stops a service worker after 30 s with no event or extension API call,
// and a tailor run or a letter with a lint retry can take longer (#1).
function keepAlive<T>(work: Promise<T>): Promise<T> {
  const ping = setInterval(() => void chrome.runtime.getPlatformInfo(), 20_000)
  return work.finally(() => clearInterval(ping))
}

// Job status lives in storage so a result survives the popup closing, and a cancel
// in the popup stops watching without stopping the run (https://github.com/TheLinc/cover-me/commit/9f4ea308).
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

// A Pro run's local copy shares its ID with the server copy, so uploading local
// history never duplicates it. A failed save mustn't fail a finished run (#24).
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

// These ATS hosts render postings in cross-origin iframes on company careers
// pages (https://github.com/TheLinc/cover-me/commit/d7700ca5).
const EMBEDDED_ATS_HOSTS = ['greenhouse.io', 'lever.co', 'myworkdayjobs.com', 'ashbyhq.com', 'bamboohr.com', 'workable.com']

// Same-hostname iframes count because LinkedIn renders the job pane in one at
// /preload/. urls is empty when Chrome won't script the tab at all (#130).
async function listScrapableFrames(tabId: number): Promise<{ frameIds: number[]; urls: Map<number, string> }> {
  try {
    const frames = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => location.href,
    })
    const hostOf = (href: unknown) => (typeof href === 'string' && URL.canParse(href) ? new URL(href).hostname : '')
    const topHost = hostOf(frames.find((f) => f.frameId === 0)?.result)
    const listed = frames.filter((f) => {
      const host = hostOf(f.result)
      if (!host) return false
      if (f.frameId === 0) return true
      return host === topHost || EMBEDDED_ATS_HOSTS.some((h) => host === h || host.endsWith('.' + h))
    })
    const ids = listed.map((f) => f.frameId)
    return {
      frameIds: ids.length > 0 ? [...new Set([0, ...ids])] : [0],
      urls: new Map(listed.map((f) => [f.frameId, f.result as string])),
    }
  } catch {
    return { frameIds: [0], urls: new Map() }
  }
}

class ScrapeError extends Error {
  constructor(readonly failure: ScrapeFailure) {
    super(failure.error)
  }
}

type FrameScrape = { frameId: number; snapshot?: PageSnapshot | null } & (
  | { ok: true; job: JobData }
  | { ok: false; error: Error; connection: boolean }
)

// Built by vite.config.ts (contentScriptIife) as one classic script, and injected
// on click instead of declared in content_scripts (https://github.com/TheLinc/cover-me/commit/50badfd9).
const CONTENT_SCRIPT_FILE = 'content.js'

// forAnswer: a right-click answer's read (#232), often of an application form
// with no posting on it; the server doesn't count those as failed reads.
async function scrapeTab(tabId: number, { forAnswer = false } = {}): Promise<JobData> {
  const { frameIds, urls } = await listScrapableFrames(tabId)
  const fail = async (error: string, frameId?: number) =>
    new ScrapeError(scrapeFailure(await topFrameUrl(tabId), [...urls.values()], error, frameId === undefined ? undefined : urls.get(frameId)))

  // activeTab covers the main frame and host_permissions the ATS frames. A frame
  // that refuses gets a connection error below and the inline fallback (https://github.com/TheLinc/cover-me/commit/50badfd9).
  await chrome.scripting
    .executeScript({ target: { tabId, frameIds }, files: [CONTENT_SCRIPT_FILE] })
    .catch(() => {})

  const wantSnapshot = !!SUPABASE_URL && (await hasAgreedToPageRead())
  const local: FrameScrape[] = await Promise.all(
    frameIds.map(async (frameId): Promise<FrameScrape> => {
      try {
        const scrape = (await chrome.tabs.sendMessage(tabId, { type: 'SCRAPE_JOB', snapshot: wantSnapshot }, { frameId })) as FrameScrapeResponse
        if (scrape.success) return { frameId, ok: true, job: scrape.job, snapshot: scrape.snapshot }
        return { frameId, ok: false, error: new Error(scrape.error), connection: false, snapshot: scrape.snapshot }
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err))
        return { frameId, ok: false, error: e, connection: isConnectionError(e) }
      }
    }),
  )
  const results = await preferServerScrapes(local, forAnswer)

  // The top frame wins so sites that worked before iframes were read behave the
  // same (https://github.com/TheLinc/cover-me/commit/d7700ca5).
  const top = results.find((r) => r.frameId === 0)
  if (top?.ok) return top.job
  const successes = results.filter((r): r is Extract<FrameScrape, { ok: true }> => r.ok)
  if (successes.length > 0) {
    successes.sort((a, b) => b.job.description.length - a.job.description.length)
    const job = successes[0].job
    return { ...job, url: (await topFrameUrl(tabId)) ?? job.url }
  }

  // A scraper's own error carries a site-specific message, so it beats a connection
  // error, which only means the content script isn't loaded (https://github.com/TheLinc/cover-me/commit/d7700ca5).
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
    // Selector results beat heuristic ones in any frame: the top frame may be an
    // empty shell whose heuristic grabs nav text (https://github.com/TheLinc/cover-me/commit/d7700ca5).
    valid.sort((a, b) =>
      Number(!!a.r.heuristic) - Number(!!b.r.heuristic) ||
      Number(b.frameId === 0) - Number(a.frameId === 0) ||
      b.r.description.length - a.r.description.length)
    result = valid[0]?.r ?? null
    resultFrameId = valid[0]?.frameId ?? 0
  } catch {
    // Restricted pages such as chrome:// URLs can't be scripted (https://github.com/TheLinc/cover-me/commit/a074665d).
  }

  if (result && result.description.length > 200) {
    const url = resultFrameId === 0 ? result.url : await topFrameUrl(tabId) ?? result.url
    return { title: result.title, company: result.company, description: result.description, url }
  }

  throw await fail('Could not read this page. Try refreshing, or paste the job description manually.')
}

// The server's read wins even where the bundled scrapers also read a job: outdated
// scrapers tend to return a wrong or partial job rather than fail (#3).
async function preferServerScrapes(results: FrameScrape[], forAnswer = false): Promise<FrameScrape[]> {
  const sent = results.filter((r) => r.snapshot)
  if (!SUPABASE_URL || sent.length === 0) return results
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
    return results.map((r) => {
      const s = byFrame.get(r.frameId)
      return s?.ok ? { frameId: r.frameId, ok: true, job: s.job } : r
    })
  } catch (err) {
    await debugGroup('Scrape — server unavailable, using bundled scrapers', { error: err instanceof Error ? err.message : String(err) })
    return results
  }
}

// An iframe's location.href, like LinkedIn's /preload/ frame, is not the address
// the user sees (https://github.com/TheLinc/cover-me/commit/d7700ca5).
async function topFrameUrl(tabId: number): Promise<string | undefined> {
  try {
    return (await chrome.tabs.get(tabId)).url ?? undefined
  } catch {
    return undefined
  }
}

function isConnectionError(err: Error): boolean {
  const msg = err.message.toLowerCase()
  return msg.includes('could not establish connection') ||
    msg.includes('receiving end does not exist') ||
    msg.includes('no tab with id')
}

// Must not use anything from outer scope: executeScript serializes the function
// and runs it in the page (https://github.com/TheLinc/cover-me/commit/a074665d).
function inlineScraper(): { title: string; company: string; description: string; url: string; heuristic?: boolean } | null {
  const url = location.href

  // querySelector never enters shadow roots, and LinkedIn's interop shell renders
  // content inside them (https://github.com/TheLinc/cover-me/commit/d7700ca5).
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

  // One comma-joined querySelector would return document order, not this order
  // (https://github.com/TheLinc/cover-me/commit/d7700ca5).
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

  // LinkedIn's first h2 is its toast counter, "0 notifications total"
  // (https://github.com/TheLinc/cover-me/commit/d7700ca5).
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
  // Which file a result came from isn't resume content for the model to revise (#131).
  const { sourceHash: _h, designFellBack: _f, ...previous } = lastResult ?? {} as TailoredResume
  try {
    const settings = await getSettings()

    // "Your design" (#131): the user's file sets the page, so there's no
    // compacting, and no summary when the file has none to rewrite.
    let design = await designForTailor()
    // The popup hides "Compact" whenever "Your design" is picked, fallen back or not (#131).
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

    // Progress is stored on the job record so a reopened popup still shows it
    // (https://github.com/TheLinc/cover-me/commit/d7700ca5).
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
      // The resume and final prompt live on the server. DEBUG_MODE on the edge
      // function logs them (https://github.com/TheLinc/cover-me/commit/9f4ea308).
      const localId = crypto.randomUUID()
      // Looked up alongside the tailor, so a change of plan counts without a
      // wait once the resume is back (#181).
      const tier = checkedTier(session)
      const { resume: tailored, savedId } = await tailorViaBackend(job, session.access_token, compact, merged, trim, includeSummary, lastResult && previous, onProgress, localId, design.design)
      const resume = await finishDesign(tailored, design)
      if (note) resume.hasEdits = true
      // Awaited before the design upload, which reads the cached tier (#181).
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

    // "Your design" places the text with the parse its file was checked against (#131).
    const before = design
    const read = await parseForTailor(design, resumeData, async () => {
      onProgress('Reading your resume (first run only)…')
      const fresh = await parseResumeStructure(resumeData.text, settings.provider, apiKey)
      onProgress('') // the next stage shows the plain "Plan the changes" (#25)
      return fresh
    })
    const parsed = read.parsed
    design = read.design
    if (design !== before) fitLayout() // a new parse can change the summary or fall back (#239)

    // Short bullet counts here mean the model never saw the missing bullets
    // (https://github.com/TheLinc/cover-me/commit/9f4ea308).
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
      // The tier is looked up alongside the letter, so a change of plan
      // counts without holding the letter back from History (#181).
      const [letter, tier] = await Promise.all([generateViaBackend(job, session.access_token, merged), checkedTier(session)])
      const pro = tier === 'hosted_pro'
      const entry: CoverLetter = {
        id: crypto.randomUUID(),
        job,
        letter,
        createdAt: new Date().toISOString(),
        // A Pro letter belongs in the account; History retries it if this save fails (#24).
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
