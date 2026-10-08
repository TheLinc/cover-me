// The scrapers run in two places: in the scrape Edge Function (primary, so a
// board's markup change ships by deploying it) and bundled in the extension
// (offline fallback). Deno can't import from the extension tree, so the
// function gets a byte-identical copy.
//
//   node scripts/sync-scrapers.mjs           copy extension -> backend
//   node scripts/sync-scrapers.mjs --check   fail if the copy is stale
//
// Edit only extension/src/content/scrapers/, then run the copy. The extension
// build and the backend tests (so deploy:prod) run --check.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'extension/src/content/scrapers')
const DEST = join(ROOT, 'backend/supabase/functions/_shared/scrapers')

const shared = (dir) =>
  existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts')).sort() : []
const read = (dir, f) => readFileSync(join(dir, f), 'utf8').replace(/\r\n/g, '\n')

const src = shared(SRC)
const stale = [
  ...src.filter((f) => !existsSync(join(DEST, f)) || read(SRC, f) !== read(DEST, f)),
  ...shared(DEST).filter((f) => !src.includes(f)),
]

if (process.argv.includes('--check')) {
  if (stale.length) {
    console.error(`Scraper copy is stale (${stale.join(', ')}). Run: node scripts/sync-scrapers.mjs`)
    process.exit(1)
  }
  console.log('scrapers in sync')
} else {
  mkdirSync(DEST, { recursive: true })
  for (const f of shared(DEST)) if (!src.includes(f)) rmSync(join(DEST, f))
  for (const f of src) writeFileSync(join(DEST, f), read(SRC, f))
  console.log(`copied ${src.length} files to ${DEST}`)
}
