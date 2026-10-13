// The letter and resume PDFs are built in two places: the extension and the
// website's dashboard. The website gets a byte-identical copy of the
// extension's folder.
//
//   node scripts/sync-pdf.mjs           copy extension -> web
//   node scripts/sync-pdf.mjs --check   fail if the copy is stale
//
// Edit only extension/src/lib/pdf/, then run the copy. The extension build and
// the website's `pnpm check` (CI) run --check.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'extension/src/lib/pdf')
const DEST = join(ROOT, 'web/lib/pdf')

const files = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts')).sort() : [])
const read = (dir, f) => readFileSync(join(dir, f), 'utf8').replace(/\r\n/g, '\n')

const src = files(SRC)
const stale = [
  ...src.filter((f) => !existsSync(join(DEST, f)) || read(SRC, f) !== read(DEST, f)),
  ...files(DEST).filter((f) => !src.includes(f)),
]

if (process.argv.includes('--check')) {
  if (stale.length) {
    console.error(`web/lib/pdf is stale (${stale.join(', ')}). Run: node scripts/sync-pdf.mjs`)
    process.exit(1)
  }
  console.log('pdf copy in sync')
} else {
  mkdirSync(DEST, { recursive: true })
  for (const f of files(DEST)) if (!src.includes(f)) rmSync(join(DEST, f))
  for (const f of src) writeFileSync(join(DEST, f), read(SRC, f))
  console.log(`copied ${src.length} files to web/lib/pdf`)
}
