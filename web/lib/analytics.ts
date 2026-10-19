import type { CaptureResult } from 'posthog-js'

// PostHog counts page views on the public site, cookieless, to see which links
// bring visitors (utm_* tags and referrers). Signed-in pages never reach it:
// their URLs carry OAuth codes, Stripe session IDs and application IDs.
const PRIVATE_PATHS = ['/dashboard', '/auth', '/upgraded', '/api']

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

const URL_PROPS = ['$current_url', '$referrer', '$prev_pageview_url']

export function scrubEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event) return null
  const props = event.properties
  if (isPrivatePath(props.$pathname)) return null
  if (isPrivatePath(props.$prev_pageview_pathname)) {
    for (const key of Object.keys(props)) if (key.startsWith('$prev_pageview_')) delete props[key]
  }
  for (const key of URL_PROPS) if (key in props) props[key] = cleanUrl(props[key])
  return event
}
