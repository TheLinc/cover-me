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

// Scrape the active tab. Tries the content script first; falls back to a
// self-contained inline scraper injected via chrome.scripting.executeScript
// so the user doesn't need to refresh after installing or reloading the extension.
async function scrapeTab(tabId: number): Promise<JobData> {
  // --- Primary path: content script message ---
  try {
    const scrape = (await chrome.tabs.sendMessage(tabId, { type: 'SCRAPE_JOB' })) as ScrapeResponse
    if (scrape.success) return scrape.job
    throw new Error(scrape.error)
  } catch (primaryErr) {
    // Content script not responding — fall through to inline injection.
    // Rethrow immediately if it IS responding but reported a scrape failure
    // (i.e. the error came from the scraper, not from sendMessage itself).
    if (primaryErr instanceof Error && !isConnectionError(primaryErr)) {
      throw primaryErr
    }
  }

  // --- Fallback: inject a self-contained scraper into the page ---
  type InlineResult = { title: string; company: string; description: string; url: string }
  let result: InlineResult | null = null
  try {
    const injections = await chrome.scripting.executeScript({
      target: { tabId },
      func: inlineScraper,
    })
    const r = injections[0]?.result
    if (r && typeof r === 'object' && 'title' in r && 'description' in r) {
      result = r as InlineResult
    }
  } catch {
    // scripting API unavailable or page is restricted (e.g. chrome:// URLs)
  }

  if (result && result.description.length > 200) {
    return { title: result.title, company: result.company, description: result.description, url: result.url }
  }

  throw new Error(
    'Could not read this page. Try refreshing, or paste the job description manually.',
  )
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
function inlineScraper(): { title: string; company: string; description: string; url: string } | null {
  const url = location.href

  // 1. JSON-LD structured data
  const ldScripts = document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]')
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
    const titleEl = document.querySelector<HTMLElement>('[data-fabric-component="Headline"]')
    const descEl = document.querySelector<HTMLElement>('.BambooRichText')
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

  // 3. Common ATS selectors (Greenhouse, Ashby, Lever, Workable, etc.)
  const atsTitleEl = document.querySelector<HTMLElement>(
    '[data-qa="job-title"], .job-title, [class*="posting-title"], h1[class*="title"], h1',
  )
  const atsDescEl = document.querySelector<HTMLElement>(
    '[data-qa="job-description"], .posting-description, [class*="job-description"], #content',
  )
  const atsTitle = atsTitleEl?.innerText?.trim() ?? ''
  const atsDesc = atsDescEl?.innerText?.trim() ?? ''
  if (atsTitle && atsDesc.length > 200) {
    return { title: atsTitle, company: 'Unknown Company', description: atsDesc, url }
  }

  // 4. Heuristic: largest text block + first h1
  const h1 = Array.from(document.querySelectorAll<HTMLElement>('h1, h2'))
    .find((el) => { const t = el.innerText?.trim(); return t && t.length > 2 && t.length < 120 })
  const blocks = Array.from(document.querySelectorAll<HTMLElement>('div, section, article'))
    .filter((el) => (el.innerText?.trim().length ?? 0) > 500)
    .sort((a, b) => (b.innerText?.length ?? 0) - (a.innerText?.length ?? 0))
  const hTitle = h1?.innerText?.trim() ?? ''
  const hDesc = blocks[0]?.innerText?.trim() ?? ''
  if (hTitle && hDesc.length > 200) return { title: hTitle, company: 'Unknown Company', description: hDesc, url }

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

    if (settings?.mode === 'hosted') {
      const session = await ensureValidSession()
      if (!session) {
        return failTailor(id, job, startedAt, 'Session expired. Please sign in again in Settings.')
      }
      // Hosted: the resume + final prompt live server-side. Enable DEBUG_MODE on
      // the edge function to see those in the Supabase function logs.
      const resume = await tailorViaBackend(job, session.access_token, compact, merged, trim, includeSummary, previous)
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
      parsed = await parseResumeStructure(resumeData.text, settings.provider, apiKey)
      await saveParsedResume(parsed)
    }

    // Shows how many bullets the parser extracted per role — if this is already
    // short, the model never saw the missing bullets in the first place.
    await debugGroup('Tailor — parsed resume (BYOK, input to model)', {
      parsed,
      bulletsPerRole: parsed.experience?.map((e) => ({ role: e.title, bullets: e.bullets?.length })),
    })

    const tailored = await tailorResume(job, parsed, settings.provider, apiKey, compact, merged, trim, includeSummary, previous)
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
