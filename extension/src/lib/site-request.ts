import type { ScraperName } from '../content/scrapers/index.ts'
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config'

// The popup's "Request this site" and "Report bug" buttons (#130), through the
// site-request Edge Function. A press is consent for that one send, whatever
// the user chose on the page-read notice.
export type SiteRequest =
  | { kind: 'site'; host: string }
  | { kind: 'bug'; url: string; scraper: ScraperName; error: string; version: string }

// Throws with the response status, 0 when the server couldn't be reached.
export async function sendSiteRequest(body: SiteRequest): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/site-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null)
  if (!res?.ok) throw Object.assign(new Error('Site request failed'), { status: res?.status ?? 0 })
}

// Sites this browser has asked for, so a later visit thanks instead of asking again.
export async function requestedSites(): Promise<string[]> {
  const { requestedSites } = await chrome.storage.local.get('requestedSites')
  return (requestedSites as string[] | undefined) ?? []
}

export async function rememberRequestedSite(host: string): Promise<void> {
  await chrome.storage.local.set({ requestedSites: [...new Set([...(await requestedSites()), host])] })
}
