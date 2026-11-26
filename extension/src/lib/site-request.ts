import type { ScraperName } from '../content/scrapers/index.ts'
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config'

// The popup's "Request this site" and "Report bug" buttons (#130), through the
// site-request Edge Function. A press is consent for that one send, whatever
// the user chose on the page-read notice. A watch is the signed-in "Email me
// when it's supported" box (#195), the only kind sent with a token.
export type SiteRequest =
  | { kind: 'site'; host: string }
  | { kind: 'bug'; url: string; scraper: ScraperName; error: string; version: string }
  | { kind: 'watch'; host: string; watch: boolean }

// The error carries the HTTP status, or 0 for no answer, so the popup can word its message (#130).
export async function sendSiteRequest(body: SiteRequest, token?: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/site-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_PUBLISHABLE_KEY, ...(token && { Authorization: `Bearer ${token}` }) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null)
  if (!res?.ok) throw Object.assign(new Error('Site request failed'), { status: res?.status ?? 0 })
}

// Kept so a later visit to the same site thanks the user instead of asking again (#130).
export async function requestedSites(): Promise<string[]> {
  const { requestedSites } = await chrome.storage.local.get('requestedSites')
  return (requestedSites as string[] | undefined) ?? []
}

export async function rememberRequestedSite(host: string): Promise<void> {
  await chrome.storage.local.set({ requestedSites: [...new Set([...(await requestedSites()), host])] })
}
