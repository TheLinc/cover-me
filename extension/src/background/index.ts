import { ensureValidSession, generateViaBackend, RateLimitError } from '../lib/auth'
import { generateCoverLetter } from '../lib/ai'
import { decryptApiKey } from '../lib/crypto'
import { addToHistory, getResume, getSettings } from '../lib/storage'
import type { CoverLetter, GenerateResponse, JobData, ScrapeResponse } from '../types'

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GENERATE_FROM_TAB') {
    handleGenerate().then(sendResponse)
    return true
  }
  if (message.type === 'GENERATE_FROM_MANUAL') {
    handleGenerateManual(message.job as JobData).then(sendResponse)
    return true
  }
})

async function handleGenerate(): Promise<GenerateResponse> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  const tab = tabs[0]
  if (!tab?.id) return { success: false, error: 'Could not access the current tab.' }

  let job: JobData
  try {
    const scrape = (await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_JOB' })) as ScrapeResponse
    if (!scrape.success) return { success: false, error: scrape.error }
    job = scrape.job
  } catch (err) {
    console.error('[cover-me] sendMessage failed:', err)
    return {
      success: false,
      error: 'Could not read this page. Try refreshing, or paste the job description manually.',
    }
  }

  return generateFromJob(job)
}

async function handleGenerateManual(job: JobData): Promise<GenerateResponse> {
  return generateFromJob(job)
}

async function generateFromJob(job: JobData): Promise<GenerateResponse> {
  try {
    const settings = await getSettings()

    // Hosted path: JWT sent to backend, no local API key or resume needed
    if (settings?.mode === 'hosted') {
      const session = await ensureValidSession()
      if (!session) {
        return {
          success: false,
          error: 'Session expired. Please sign in again in Settings.',
        }
      }
      const letter = await generateViaBackend(job, session.access_token)
      const entry: CoverLetter = {
        id: crypto.randomUUID(),
        job,
        letter,
        createdAt: new Date().toISOString(),
      }
      await addToHistory(entry)
      return { success: true, letter, job }
    }

    // BYOK path: decrypt local key, generate locally
    if (!settings?.apiKey) {
      return { success: false, error: 'No API key set. Open Settings to add your key.' }
    }
    const resume = await getResume()
    if (!resume?.text) {
      return { success: false, error: 'No resume uploaded. Open Resume to upload yours.' }
    }

    const apiKey = await decryptApiKey(settings.apiKey)
    const letter = await generateCoverLetter(job, resume.text, settings.provider, apiKey)
    const entry: CoverLetter = {
      id: crypto.randomUUID(),
      job,
      letter,
      createdAt: new Date().toISOString(),
    }
    await addToHistory(entry)
    return { success: true, letter, job }
  } catch (err) {
    if (err instanceof RateLimitError) {
      return { success: false, error: err.message, errorCode: 'RATE_LIMIT' }
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Generation failed. Please try again.',
    }
  }
}
