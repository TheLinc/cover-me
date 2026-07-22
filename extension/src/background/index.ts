import { ensureValidSession, generateViaBackend, RateLimitError, saveLetterToBackend, tailorViaBackend } from '../lib/auth'
import { generateCoverLetter } from '../lib/ai'
import { parseResumeStructure } from '../lib/ai/resume-parse'
import { tailorResume } from '../lib/ai/resume-tailor'
import { decryptApiKey } from '../lib/crypto'
import { debugGroup } from '../lib/debug'
import { addToHistory, getCachedTier, getCandidateContext, getResume, getSettings, saveParsedResume } from '../lib/storage'
import type { CoverJob, CoverLetter, GenerateResponse, JobData, ScrapeResponse, TailoredResume, TailorJob, TailorResponse } from '../types'

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return
  if (message.type === 'SCRAPE_TAB') {
    handleScrapeTab().then(sendResponse)
    return true
  }
  if (message.type === 'GENERATE_FROM_TAB') {
    handleGenerate().then(sendResponse)
    return true
  }
  if (message.type === 'GENERATE_FROM_MANUAL') {
    handleGenerateManual(message.jobId as string | undefined, message.job as JobData, message.supplemental as string | undefined).then(sendResponse)
    return true
  }
  if (message.type === 'TAILOR_FROM_TAB') {
    handleTailorFromTab(!!message.compact).then(sendResponse)
    return true
  }
  if (message.type === 'TAILOR_FROM_MANUAL') {
    handleTailorFromManual(message.jobId as string | undefined, message.job as JobData, !!message.compact, message.supplemental as string | undefined, !!message.trim, message.includeSummary !== false, message.previous as TailoredResume | undefined).then(sendResponse)
    return true
  }
})

// --- Job lifecycle persistence ---------------------------------------------
// The actual AI call runs here in the service worker, independent of the popup.
// We persist the job's status to chrome.storage.local so the result survives the
// popup closing mid-generation, and so a "cancel" in the popup can stop watching
// without aborting the work (the generation still completes and still counts).
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

async function failTailor(id: string, job: JobData, startedAt: number, error: string): Promise<TailorResponse> {
  await setTailorJob({ id, status: 'error', job, error, startedAt })
  return { success: false, error }
}

// ATS providers that render job postings inside cross-origin iframes on
// company careers pages. Frames on these hosts are worth scraping even though
// they don't match the top frame's hostname.
const EMBEDDED_ATS_HOSTS = ['greenhouse.io', 'lever.co', 'myworkdayjobs.com', 'ashbyhq.com', 'bamboohr.com', 'workable.com']

// Enumerate frames worth scraping: the top frame, same-hostname iframes
// (LinkedIn's interop shell renders the job pane in a same-origin iframe at
// /preload/), and known ATS iframes. Ad/tracking iframes never match. Falls
// back to top-frame-only when scripting is unavailable (restricted pages).
async function listScrapableFrames(tabId: number): Promise<number[]> {
  try {
    const frames = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => location.hostname,
    })
    const topHost = frames.find((f) => f.frameId === 0)?.result
    const ids = frames
      .filter((f) => {
        const host = typeof f.result === 'string' ? f.result : ''
        if (!host) return false
        if (f.frameId === 0) return true
        return host === topHost || EMBEDDED_ATS_HOSTS.some((h) => host === h || host.endsWith('.' + h))
      })
      .map((f) => f.frameId)
    return ids.length > 0 ? [...new Set([0, ...ids])] : [0]
  } catch {
    return [0]
  }
}

type FrameScrape =
  | { frameId: number; ok: true; job: JobData }
  | { frameId: number; ok: false; error: Error; connection: boolean }

// Scrape the active tab. Tries the content-script scrapers in every relevant
// frame (some sites render the posting inside an iframe the top frame can't
// see); falls back to a self-contained inline scraper injected via
// chrome.scripting.executeScript so the user doesn't need to refresh after
// installing or reloading the extension.
async function scrapeTab(tabId: number): Promise<JobData> {
  const frameIds = await listScrapableFrames(tabId)

  // --- Primary path: content script message, per frame ---
  const results: FrameScrape[] = await Promise.all(
    frameIds.map(async (frameId): Promise<FrameScrape> => {
      try {
        const scrape = (await chrome.tabs.sendMessage(tabId, { type: 'SCRAPE_JOB' }, { frameId })) as ScrapeResponse
        if (scrape.success) return { frameId, ok: true, job: scrape.job }
        return { frameId, ok: false, error: new Error(scrape.error), connection: false }
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err))
        return { frameId, ok: false, error: e, connection: isConnectionError(e) }
      }
    }),
  )

  // The top frame keeps its historical precedence so already-working sites
  // behave exactly as before; among iframe hits, take the longest description.
  const top = results.find((r) => r.frameId === 0)
  if (top?.ok) return top.job
  const successes = results.filter((r): r is Extract<FrameScrape, { ok: true }> => r.ok)
  if (successes.length > 0) {
    successes.sort((a, b) => b.job.description.length - a.job.description.length)
    const job = successes[0].job
    return { ...job, url: (await topFrameUrl(tabId)) ?? job.url }
  }

  // No frame produced a job. If any frame ran our scraper and deliberately
  // failed, surface that error — it carries a site-specific message. Pure
  // connection errors mean the content script isn't loaded (e.g. right after
  // an extension reload), which the inline fallback below handles.
  const deliberate =
    results.find((r) => !r.ok && !r.connection && r.frameId === 0) ??
    results.find((r) => !r.ok && !r.connection)
  if (deliberate && !deliberate.ok) throw deliberate.error

  // --- Fallback: inject a self-contained scraper into every frame ---
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
    // Selector-based results beat last-resort heuristic ones in ANY frame
    // (the top frame may be an empty shell whose heuristic grabs nav text
    // while an iframe holds the real posting); within the same quality tier,
    // the top frame wins, then the longest description.
    valid.sort((a, b) =>
      Number(!!a.r.heuristic) - Number(!!b.r.heuristic) ||
      Number(b.frameId === 0) - Number(a.frameId === 0) ||
      b.r.description.length - a.r.description.length)
    result = valid[0]?.r ?? null
    resultFrameId = valid[0]?.frameId ?? 0
  } catch {
    // scripting API unavailable or page is restricted (e.g. chrome:// URLs)
  }

  if (result && result.description.length > 200) {
    const url = resultFrameId === 0 ? result.url : await topFrameUrl(tabId) ?? result.url
    return { title: result.title, company: result.company, description: result.description, url }
  }

  throw new Error(
    'Could not read this page. Try refreshing, or paste the job description manually.',
  )
}

// An iframe's location.href (e.g. LinkedIn's /preload/ interop frame) is not
// the address the user sees — use the tab's URL for jobs scraped from iframes.
async function topFrameUrl(tabId: number): Promise<string | undefined> {
  try {
    return (await chrome.tabs.get(tabId)).url ?? undefined
  } catch {
    return undefined
  }
}

// Returns true when the error is a Chrome messaging/connection error rather than
// a deliberate failure thrown by our own scraper code.
function isConnectionError(err: Error): boolean {
  const msg = err.message.toLowerCase()
  return msg.includes('could not establish connection') ||
    msg.includes('receiving end does not exist') ||
    msg.includes('no tab with id')
}

// Self-contained scraper injected via chrome.scripting.executeScript.
// MUST NOT reference any outer-scope variables — this function is serialised
// via .toString() and evaluated in the page's isolated world.
function inlineScraper(): { title: string; company: string; description: string; url: string; heuristic?: boolean } | null {
  const url = location.href

  // querySelector never pierces shadow roots, and some sites (LinkedIn's
  // interop shell) render page content inside open/declarative shadow DOM.
  // Collect the document plus every open shadow root and query across all.
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

  // 1. JSON-LD structured data
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
    } catch { /* malformed */ }
  }

  // 2. BambooHR specific — Fabric design system uses stable data attributes and BambooRichText class
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

  // 3. Common ATS + LinkedIn classic selectors, tried in priority order
  // (a comma-group querySelector would return document order, not our order)
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

  // 4. Heuristic: largest text block + first plausible h1 (h2 only as backup).
  // Skip headings that are clearly UI chrome (e.g. LinkedIn's toast counter
  // "0 notifications total" is the first h2 in the document).
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

async function tailorFromJob(job: JobData, compact: boolean, supplemental?: string, trim = false, includeSummary = true, jobId?: string, previous?: TailoredResume): Promise<TailorResponse> {
  const id = jobId ?? crypto.randomUUID()
  const startedAt = Date.now()
  await setTailorJob({ id, status: 'loading', job, startedAt })
  try {
    const settings = await getSettings()

    // Standing candidate facts (set once, edited in the "Candidate context" box)
    // apply to every generation, layered under any one-off note for this run.
    const candidateContext = (await getCandidateContext()).trim()
    const merged = [candidateContext, supplemental?.trim()].filter(Boolean).join('\n\n') || undefined

    await debugGroup('Tailor — scraped job + flags', {
      mode: settings?.mode ?? 'byok',
      'job.title': job.title,
      'job.company': job.company,
      'job.url': job.url,
      'job.description': job.description,
      'job.description.length': job.description?.length,
      flags: { compact, trim, includeSummary, hasCandidateContext: !!candidateContext, hasSupplemental: !!supplemental, hasPrevious: !!previous },
    })

    // Live progress: the tailor call streams the model's output and reports a
    // stage label; persisting it on the job record lets the popup show real
    // progress (and survive being closed/reopened mid-generation).
    let lastProgress = ''
    const onProgress = (progress: string): void => {
      if (progress === lastProgress) return
      lastProgress = progress
      void setTailorJob({ id, status: 'loading', job, startedAt, progress })
    }

    if (settings?.mode === 'hosted') {
      const session = await ensureValidSession()
      if (!session) {
        return failTailor(id, job, startedAt, 'Session expired. Please sign in again in Settings.')
      }
      // Hosted: the resume + final prompt live server-side. Enable DEBUG_MODE on
      // the edge function to see those in the Supabase function logs.
      const resume = await tailorViaBackend(job, session.access_token, compact, merged, trim, includeSummary, previous, onProgress)
      await setTailorJob({ id, status: 'done', job, resume, startedAt })
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

    // Lazy parse: run once on first tailor, cache result for all subsequent tailors.
    // Re-run automatically when resume is replaced (saveResume clears the parsed field).
    let parsed = resumeData.parsed
    if (!parsed) {
      onProgress('Reading your resume (first run only)…')
      parsed = await parseResumeStructure(resumeData.text, settings.provider, apiKey)
      await saveParsedResume(parsed)
    }

    // Shows how many bullets the parser extracted per role — if this is already
    // short, the model never saw the missing bullets in the first place.
    await debugGroup('Tailor — parsed resume (BYOK, input to model)', {
      parsed,
      bulletsPerRole: parsed.experience?.map((e) => ({ role: e.title, bullets: e.bullets?.length })),
    })

    const tailored = await tailorResume(job, parsed, settings.provider, apiKey, compact, merged, trim, includeSummary, previous, onProgress)
    await setTailorJob({ id, status: 'done', job, resume: tailored, startedAt })
    return { success: true, resume: tailored, job }
  } catch (err) {
    if (err instanceof RateLimitError) {
      await setTailorJob({ id, status: 'error', job, error: err.message, errorCode: 'RATE_LIMIT', startedAt })
      return { success: false, error: err.message, errorCode: 'RATE_LIMIT' }
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

    // Standing candidate facts (set once, edited in the "Candidate context" box)
    // apply to every generation, layered under any one-off note for this run.
    const candidateContext = (await getCandidateContext()).trim()
    const merged = [candidateContext, supplemental?.trim()].filter(Boolean).join('\n\n') || undefined

    await debugGroup('Cover letter — scraped job', {
      mode: settings?.mode ?? 'byok',
      'job.title': job.title,
      'job.company': job.company,
      'job.url': job.url,
      'job.description': job.description,
      'job.description.length': job.description?.length,
      hasCandidateContext: !!candidateContext,
      hasSupplemental: !!supplemental,
    })

    // Hosted path: JWT sent to backend, no local API key or resume needed
    if (settings?.mode === 'hosted') {
      const session = await ensureValidSession()
      if (!session) {
        return failCover(id, job, startedAt, 'Session expired. Please sign in again in Settings.')
      }
      const letter = await generateViaBackend(job, session.access_token, merged)
      const entry: CoverLetter = {
        id: crypto.randomUUID(),
        job,
        letter,
        createdAt: new Date().toISOString(),
      }
      await addToHistory(entry)
      const tier = await getCachedTier()
      if (tier === 'hosted_pro') {
        saveLetterToBackend(session.access_token, entry).catch(() => {})
      }
      await setCoverJob({ id, status: 'done', job, letter, createdAt: entry.createdAt, startedAt })
      return { success: true, letter, job }
    }

    // BYOK path: decrypt local key, generate locally
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
      await setCoverJob({ id, status: 'error', job, error: err.message, errorCode: 'RATE_LIMIT', startedAt })
      return { success: false, error: err.message, errorCode: 'RATE_LIMIT' }
    }
    const error = err instanceof Error ? err.message : 'Generation failed. Please try again.'
    await setCoverJob({ id, status: 'error', job, error, startedAt })
    return { success: false, error }
  }
}
