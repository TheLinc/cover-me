// Reads the job from page HTML the extension sends (see
// extension/src/content/snapshot.ts) with the same scrapers the extension
// bundles, so fixing a board is a deploy of this function, not a store release.
// The scrapers live in _shared/scrapers/, copied from the extension by
// scripts/sync-scrapers.mjs: edit them there.
//
// No account needed (BYOK users call it too), so verify_jwt is off in
// config.toml. It reads nothing from the database and calls nothing outside.
// The HTML can carry a signed-in user's name and more: never log it or put it
// in an error.
import { parseHTML } from 'npm:linkedom@0.18.13'
import { handleCors, json } from '../_shared/cors.ts'
import { scrapeHtml } from '../_shared/scrapers/page.ts'

const MAX_PAGES = 8
// Decompressed body, checked while reading, before anything is parsed. The
// extension doesn't send pages above 3M characters; the largest real posting
// seen is 420 KB.
const MAX_BYTES = 4_000_000

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

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
