import type { CaptureResult, PostHog } from 'posthog-js'

// These URLs carry OAuth codes, Stripe session IDs, application IDs or a gift
// trial code, so PostHog never sees them (#33, #112).
const PRIVATE_PATHS = ['/dashboard', '/auth', '/upgraded', '/api', '/redeem']

export function isPrivatePath(pathname: unknown): boolean {
  if (typeof pathname !== 'string') return false
  return PRIVATE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

// Keeps only utm_* parameters. PostHog's "$direct" referrer isn't a URL and passes through (#33).
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

// A middle click opens the listing too, so it counts (#36). campaign matches the
// store dashboard's utm_campaign split (#280).
export function storeClick(e: Pick<MouseEvent, 'type' | 'button' | 'target'>): { link_text: string; campaign?: string } | null {
  if (e.type === 'auxclick' && e.button !== 1) return null
  const target = e.target as Element | null
  const link = typeof target?.closest === 'function' ? target.closest('a[href]') : null
  const href = link?.getAttribute('href')
  if (!link || !href?.startsWith(STORE_ORIGIN)) return null
  // innerText, because the dock link holds a wide and a narrow label (#36)
  const text = (link as HTMLElement).innerText ?? link.textContent
  const label = text?.replace(/\s+/g, ' ').trim() || link.getAttribute('aria-label') || ''
  const campaign = new URL(href).searchParams.get('utm_campaign')
  return { link_text: label.slice(0, 60), ...(campaign && { campaign }) }
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

// capture() drops events sent before PostHog loads, which is after the page (#106).
export const POSTHOG_LOADED = 'posthog-loaded'

// Without a PostHog key (local and preview builds) fn never runs (#106).
export function whenPosthogLoaded(posthog: PostHog, fn: () => void): () => void {
  if (posthog.__loaded) {
    fn()
    return () => {}
  }
  window.addEventListener(POSTHOG_LOADED, fn, { once: true })
  return () => window.removeEventListener(POSTHOG_LOADED, fn)
}

export function capture(event: string, props: Record<string, unknown>) {
  void import('posthog-js').then(({ default: posthog }) => whenPosthogLoaded(posthog, () => posthog.capture(event, props)))
}
