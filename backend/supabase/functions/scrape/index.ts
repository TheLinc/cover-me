// Reads the job from page HTML the extension sends (see
// extension/src/content/snapshot.ts) with the same scrapers the extension
// bundles, so fixing a board is a deploy of this function, not a store release.
// The scrapers live in _shared/scrapers/, copied from the extension by
// scripts/sync-scrapers.mjs: edit them there.
//
// No account needed (BYOK users call it too), so verify_jwt is off in
// config.toml and calls are rate-limited per IP (per /64 for IPv6) instead
// (_shared/ip-rate-limit.ts).
// The HTML can carry a signed-in user's name and more: never log it or put it
// in an error. Never log or store the IP either; only its HMAC is stored.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { parseHTML } from 'npm:linkedom@0.18.13'
import { handleCors, json } from '../_shared/cors.ts'
import { checkIpRateLimit } from '../_shared/ip-rate-limit.ts'
import { capture } from '../_shared/posthog.ts'
import { readBody } from '../_shared/read-body.ts'
import { scraperFor } from '../_shared/scrapers/index.ts'
import { scrapeHtml } from '../_shared/scrapers/page.ts'

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void }

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SERVICE_KEY')!)

// A click is one call, so a person stays far below these. Over them the
// extension falls back to its bundled scrapers, which is why shared IPs can
// afford a modest day limit.
const PER_MINUTE = 20
const PER_DAY = 300

const MAX_PAGES = 8
// Decompressed body, checked while reading, before anything is parsed. The
// extension doesn't send pages above 3M characters; the largest real posting
// seen is 420 KB.
const MAX_BYTES = 4_000_000

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  // Fails closed: any non-200 sends the extension to its bundled scrapers, so
  // refusing costs a user little.
  const limit = await checkIpRateLimit(supabase, req, 'scrape', PER_MINUTE, PER_DAY)
  if (limit !== 'ok') return json({ error: limit === 'over' ? 'Too many requests' : 'Try again shortly' }, limit === 'over' ? 429 : 503)

  let pages: unknown
  try {
    const body = await readBody(req, MAX_BYTES)
    if (body === null) return json({ error: 'Request too large' }, 413)
    pages = (JSON.parse(body) as { pages?: unknown }).pages
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  if (!Array.isArray(pages) || pages.length === 0 || pages.length > MAX_PAGES || !pages.every(isPage)) {
    return json({ error: `Send { pages: [{ url, html }] } with 1 to ${MAX_PAGES} pages` }, 400)
  }

  const results = pages.map(({ url, html }) => {
    try {
      return { ok: true, job: scrapeHtml(parseHTML, url, html) }
    } catch (err) {
      // Scraper errors are fixed messages ("Could not find job details on this
      // Lever page."), never page content.
      return { ok: false, error: err instanceof Error ? err.message : 'Could not read this page' }
    }
  })
  // A click that read nothing here is counted (#130), by host and scraper
  // only: never the URL, which can carry a search, or the page. It may still
  // have worked: the bundled scrapers or a frame not sent can read the job.
  if (!results.some((r) => r.ok)) {
    EdgeRuntime.waitUntil(capture('scrape_failed', crypto.randomUUID(), {
      pages: pages.map(({ url }) => ({ hostname: new URL(url).hostname, scraper: scraperFor(new URL(url).hostname) })),
    }))
  }
  return json({ results })
})

function isPage(p: unknown): p is { url: string; html: string } {
  if (!p || typeof p !== 'object') return false
  const { url, html } = p as Record<string, unknown>
  return typeof html === 'string' && typeof url === 'string' && /^https?:\/\//.test(url) && URL.canParse(url)
}
