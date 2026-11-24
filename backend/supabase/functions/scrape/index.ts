// The scrapers in _shared/scrapers/ are copied from the extension by
// scripts/sync-scrapers.mjs: edit them there (#3).
// No account needed (BYOK users call it too), so verify_jwt is off in
// config.toml and calls are rate-limited per IP instead (#3).
// The HTML can carry a signed-in user's name: never log it or put it in an
// error. Never log or store the IP either, only its HMAC (#3).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { Parser } from 'npm:htmlparser2@10.1.0'
import { parseHTML } from 'npm:linkedom@0.18.13'
import { handleCors, json } from '../_shared/cors.ts'
import { checkIpRateLimit } from '../_shared/ip-rate-limit.ts'
import { capture } from '../_shared/posthog.ts'
import { readBody } from '../_shared/read-body.ts'
import { scraperFor } from '../_shared/scrapers/index.ts'
import { scrapeUntrusted } from '../_shared/scrapers/page.ts'

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void }

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SERVICE_KEY')!)

// Over these the extension falls back to its bundled scrapers, so shared IPs
// can afford a modest day limit (#3)
const PER_MINUTE = 20
const PER_DAY = 300

const MAX_PAGES = 8
// The extension sends no page above 3M characters; the largest real posting
// seen is 420 KB (#3)
const MAX_BYTES = 4_000_000

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  // Fails closed: any non-200 sends the extension to its bundled scrapers (#3)
  const limit = await checkIpRateLimit(supabase, req, 'scrape', PER_MINUTE, PER_DAY)
  if (limit !== 'ok') return json({ error: limit === 'over' ? 'Too many requests' : 'Try again shortly' }, limit === 'over' ? 429 : 503)

  let pages: unknown
  let forAnswer = false
  try {
    const body = await readBody(req, MAX_BYTES)
    if (body === null) return json({ error: 'Request too large' }, 413)
    const parsed = JSON.parse(body) as { pages?: unknown; answer?: unknown }
    pages = parsed.pages
    forAnswer = parsed.answer === true
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  if (!Array.isArray(pages) || pages.length === 0 || pages.length > MAX_PAGES || !pages.every(isPage)) {
    return json({ error: `Send { pages: [{ url, html }] } with 1 to ${MAX_PAGES} pages` }, 400)
  }

  const meter = { work: 0 }
  const results = pages.map(({ url, html }) => {
    try {
      return { ok: true, job: scrapeUntrusted({ parseHTML, Parser }, url, html, meter) }
    } catch (err) {
      // Scraper errors are fixed messages, never page content (#3)
      return { ok: false, error: err instanceof Error ? err.message : 'Could not read this page' }
    }
  })
  // A click that read nothing here is counted (#130), by host and scraper
  // only: never the URL, which can carry a search, or the page. It may still
  // have worked: the bundled scrapers or a frame not sent can read the job.
  // A right-click answer's read (#232) isn't counted: it's often of an
  // application form with no posting on it, which is expected.
  if (!forAnswer && !results.some((r) => r.ok)) {
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
