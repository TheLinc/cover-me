// Reads the job from page HTML the extension sends (see
// extension/src/content/snapshot.ts) with the same scrapers the extension
// bundles, so fixing a board is a deploy of this function, not a store release.
// The scrapers live in _shared/scrapers/, copied from the extension by
// scripts/sync-scrapers.mjs: edit them there.
//
// No account needed (BYOK users call it too), so verify_jwt is off in
// config.toml and calls are rate-limited per IP instead (migration 014).
// The HTML can carry a signed-in user's name and more: never log it or put it
// in an error. Never log or store the IP either; only its HMAC is stored.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { parseHTML } from 'npm:linkedom@0.18.13'
import { handleCors, json } from '../_shared/cors.ts'
import { scrapeHtml } from '../_shared/scrapers/page.ts'

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
  if (!(await withinRateLimit(req))) return json({ error: 'Too many requests' }, 429)

  let pages: unknown
  try {
    const body = await readBody(req)
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
  return json({ results })
})

// The client IP as Supabase's edge sets it: Cloudflare's cf-connecting-ip,
// which a client can't override through Cloudflare, else the first
// x-forwarded-for hop. Fails open (no IP, or the database errors): the limit
// guards cost, and failing closed would cut every user over to the fallback.
async function withinRateLimit(req: Request): Promise<boolean> {
  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (!ip) {
    console.warn('scrape: no client IP header; rate limit skipped')
    return true
  }
  const { data, error } = await supabase.rpc('check_scrape_rate_limit', {
    p_ip_hash: await ipHash(ip),
    p_per_minute: PER_MINUTE,
    p_per_day: PER_DAY,
  })
  if (error) {
    console.error('scrape: rate limit check failed:', error.message)
    return true
  }
  return data === true
}

// HMAC, not a bare hash: IPv4 is small enough to reverse a plain SHA-256 by
// brute force. The key is derived from ENCRYPTION_KEY with its own label, so
// there's no new secret to set and the AES key itself is never used for this.
let hmacKey: Promise<CryptoKey> | undefined
async function ipHash(ip: string): Promise<string> {
  hmacKey ??= (async () => {
    const hex = Deno.env.get('ENCRYPTION_KEY') ?? ''
    const master = await crypto.subtle.importKey(
      'raw', new Uint8Array(hex.match(/.{2}/g)!.map((b) => parseInt(b, 16))), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const derived = await crypto.subtle.sign('HMAC', master, new TextEncoder().encode('scrape-rate-limit-v1'))
    return crypto.subtle.importKey('raw', derived, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  })()
  const mac = await crypto.subtle.sign('HMAC', await hmacKey, new TextEncoder().encode(ip))
  return Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, '0')).join('')
}

function isPage(p: unknown): p is { url: string; html: string } {
  if (!p || typeof p !== 'object') return false
  const { url, html } = p as Record<string, unknown>
  return typeof html === 'string' && typeof url === 'string' && /^https?:\/\//.test(url) && URL.canParse(url)
}

// Gzip from the extension, plain JSON from anything else. Stops reading past
// MAX_BYTES so a small compressed body can't expand without limit.
async function readBody(req: Request): Promise<string | null> {
  if (!req.body) return ''
  const stream = req.headers.get('content-encoding') === 'gzip'
    ? req.body.pipeThrough(new DecompressionStream('gzip'))
    : req.body
  const chunks: Uint8Array[] = []
  let size = 0
  for await (const chunk of stream) {
    size += chunk.byteLength
    if (size > MAX_BYTES) return null
    chunks.push(chunk)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const c of chunks) {
    bytes.set(c, offset)
    offset += c.byteLength
  }
  return new TextDecoder().decode(bytes)
}
