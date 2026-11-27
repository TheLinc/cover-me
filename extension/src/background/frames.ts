import type { PageSnapshot } from '../content/snapshot.ts'
import type { FrameScrapeResponse, JobData } from '../types'

export const CONTENT_SCRIPT_FILE = 'content.js'

const EMBEDDED_ATS_HOSTS = ['greenhouse.io', 'lever.co', 'myworkdayjobs.com', 'ashbyhq.com', 'bamboohr.com', 'workable.com']

export async function listScrapableFrames(tabId: number): Promise<{ frameIds: number[]; urls: Map<number, string> }> {
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

export type FrameScrape = { frameId: number; snapshot?: PageSnapshot | null } & (
  | { ok: true; job: JobData }
  | { ok: false; error: Error; connection: boolean }
)

// snapshot: also copy each page for the server read (#29).
export async function readFrames(tabId: number, frameIds: number[], snapshot: boolean): Promise<FrameScrape[]> {
  // A frame that can't be injected answers the message below with a connection
  // error (https://github.com/TheLinc/cover-me/commit/50badfd9)
  await chrome.scripting
    .executeScript({ target: { tabId, frameIds }, files: [CONTENT_SCRIPT_FILE] })
    .catch(() => {})
  return Promise.all(
    frameIds.map(async (frameId): Promise<FrameScrape> => {
      try {
        const scrape = (await chrome.tabs.sendMessage(tabId, { type: 'SCRAPE_JOB', snapshot }, { frameId })) as FrameScrapeResponse
        if (scrape.success) return { frameId, ok: true, job: scrape.job, snapshot: scrape.snapshot }
        return { frameId, ok: false, error: new Error(scrape.error), connection: false, snapshot: scrape.snapshot }
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err))
        return { frameId, ok: false, error: e, connection: isConnectionError(e) }
      }
    }),
  )
}

export async function bestJob(tabId: number, results: FrameScrape[]): Promise<JobData | undefined> {
  const top = results.find((r) => r.frameId === 0)
  if (top?.ok) return top.job
  const successes = results.filter((r): r is Extract<FrameScrape, { ok: true }> => r.ok)
  if (successes.length === 0) return undefined
  successes.sort((a, b) => b.job.description.length - a.job.description.length)
  const job = successes[0].job
  return { ...job, url: (await topFrameUrl(tabId)) ?? job.url }
}

// On-device only: no page copy, no server read and no inline fallback, so
// nothing leaves the browser before a click (#346).
export async function previewTab(tabId: number): Promise<JobData | null> {
  const { frameIds } = await listScrapableFrames(tabId)
  return (await bestJob(tabId, await readFrames(tabId, frameIds, false))) ?? null
}

// An iframe's location.href (LinkedIn's /preload/ frame) is not the address the user sees. https://github.com/TheLinc/cover-me/commit/d7700ca5
export async function topFrameUrl(tabId: number): Promise<string | undefined> {
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
