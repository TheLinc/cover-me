import type { CaptureResult, PostHog } from 'posthog-js'

// PostHog counts page views on the public site, cookieless, to see which links
// bring visitors (utm_* tags and referrers). Signed-in pages never reach it:
// their URLs carry OAuth codes, Stripe session IDs and application IDs.
// /redeem/<code> URLs hold a gift trial code.
const PRIVATE_PATHS = ['/dashboard', '/auth', '/upgraded', '/api', '/redeem']

// The one event a private page sends, so redemptions can be traced to the
// batch of links (the code's note) they came from.
export const TRIAL_REDEEMED = 'trial_redeemed'

export function isPrivatePath(pathname: unknown): boolean {
  if (typeof pathname !== 'string') return false
  return PRIVATE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

// Keeps a URL's utm_* parameters and drops every other parameter and the hash.
// Non-URLs (PostHog's "$direct" referrer) pass through unchanged.
export function cleanUrl(value: unknown): unknown {
  if (typeof value !== 'string') return value
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return value
  }
  const kept = new URLSearchParams()
  for (const [key, v] of url.searchParams) if (key.startsWith('utm_')) kept.append(key, v)
  url.search = kept.toString()
  url.hash = ''
  url.username = ''
  url.password = ''
  return url.toString()
}

const STORE_ORIGIN = 'https://chromewebstore.google.com/'

// A click on any link to the Chrome Web Store listing: the traffic funnel's
// last step. link_text is our own button label ("Add to Chrome"), so we can
// tell which button works. A middle click opens the listing too, so it counts.
export function storeClick(e: Pick<MouseEvent, 'type' | 'button' | 'target'>): { link_text: string } | null {
  if (e.type === 'auxclick' && e.button !== 1) return null
  const target = e.target as Element | null
  const link = typeof target?.closest === 'function' ? target.closest('a[href]') : null
  if (!link?.getAttribute('href')?.startsWith(STORE_ORIGIN)) return null
  // innerText: only the label on screen (the dock link holds a wide and a narrow one)
  const text = (link as HTMLElement).innerText ?? link.textContent
  const label = text?.replace(/\s+/g, ' ').trim() || link.getAttribute('aria-label') || ''
  return { link_text: label.slice(0, 60) }
}

const URL_PROPS = ['$current_url', '$referrer', '$prev_pageview_url']

export function scrubEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event) return null
  const props = event.properties
  if (event.event === TRIAL_REDEEMED) {
    // Every property that could carry the code: URLs, paths, entry pages.
    for (const key of Object.keys(props)) {
      if (typeof props[key] === 'string' && props[key].includes('/redeem/')) delete props[key]
    }
    props.$pathname = '/redeem'
  } else if (isPrivatePath(props.$pathname)) return null
  if (isPrivatePath(props.$prev_pageview_pathname)) {
    for (const key of Object.keys(props)) if (key.startsWith('$prev_pageview_')) delete props[key]
  }
  for (const key of URL_PROPS) if (key in props) props[key] = cleanUrl(props[key])
  return event
}

// instrumentation-client.ts dispatches this once PostHog has started. It loads
// PostHog after the page, and capture() drops events sent before then, so a
// page that captures on load or on a quick click waits for it.
export const POSTHOG_LOADED = 'posthog-loaded'

// Returns a function that cancels the wait. Without a PostHog key (local and
// preview builds) PostHog never loads, so fn never runs.
export function whenPosthogLoaded(posthog: PostHog, fn: () => void): () => void {
  if (posthog.__loaded) {
    fn()
    return () => {}
  }
  window.addEventListener(POSTHOG_LOADED, fn, { once: true })
  return () => window.removeEventListener(POSTHOG_LOADED, fn)
}
