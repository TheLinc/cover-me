// Brand regression check for the website.
//
//   node scripts/check-brand.mjs [paths...]   source checks (default: app components lib) + token contrast
//   BASE_URL=http://localhost:3000 node scripts/check-brand.mjs   also checks rendered pages
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const errors = []
const targets = process.argv.slice(2)

// ── Source checks ────────────────────────────────────────────────────────────
// Retired palettes and fonts: the first dark-indigo site, and "made to measure".
// The extension's own dark palette is allowed only inside the extension-palette
// block of globals.css; product visuals use its --ext-* tokens.
const RETIRED =
  /f2eadb|e8dcc6|c4321f|a3281a|e6b422|b3a489|1c1a17|5e574c|3b5b8f|141311|0d1117|161c2e|1e2740|2a3452|e2e8f0|94a3b8|475569|a5b4fc|28,\s*26,\s*23|196,\s*50,\s*31|242,\s*234,\s*219|179,\s*164,\s*137|59,\s*91,\s*143|230,\s*180,\s*34|13,\s*17,\s*23|Bodoni|Hanken|Plex Mono|Plus Jakarta|\b(amber|slate|violet)-\d|\b(tissue|thread|tape|chalk)\b/i
const TIMELINE = /animation-?[tT]imeline/

const walk = (p) => (statSync(p).isDirectory() ? readdirSync(p).flatMap((f) => walk(join(p, f))) : [p])
const lineOf = (src, idx) => src.slice(0, idx).split('\n').length
const block = (src, name) => [src.indexOf(`${name}:start`), src.indexOf(`${name}:end`)]

const files = (targets.length ? targets : ['app', 'components', 'lib'])
  .flatMap(walk)
  .filter((f) => ['.ts', '.tsx', '.css'].includes(extname(f)))

for (const f of files) {
  const src = readFileSync(f, 'utf8')
  const [extStart, extEnd] = block(src, 'extension-palette')
  let offset = 0
  src.split('\n').forEach((line, i) => {
    const inExt = extStart !== -1 && offset > extStart && offset < extEnd
    if (!inExt && RETIRED.test(line)) errors.push(`${f}:${i + 1} retired color/font/motif: ${line.trim().slice(0, 110)}`)
    offset += line.length + 1
  })
  if (f.endsWith('.css')) {
    const [start, end] = block(src, 'scroll-driven')
    for (const m of src.matchAll(/animation-timeline/g)) {
      if (m.index < start || m.index > end) {
        errors.push(`${f}:${lineOf(src, m.index)} animation-timeline outside the scroll-driven block`)
      }
    }
  } else if (TIMELINE.test(src)) {
    errors.push(`${f} sets animation-timeline in TS/TSX; keep it in globals.css`)
  }
}

// Token contrast (WCAG AA, 4.5:1 for body-size text)
const css = readFileSync('app/globals.css', 'utf8')
const hex = (name) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1]
const lum = (h) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const PAIRS = [
  ['ink', 'paper'], ['body', 'paper'], ['ink-2', 'paper'], ['ink-2', 'panel'], ['subtle', 'paper'], ['subtle', 'card'],
  ['on-brand', 'brand-strong'], ['brand-ink', 'brand-tint'], ['brand-strong', 'paper'], ['gap-ink', 'gap-tint'],
  ['on-night', 'night'], ['on-night-2', 'night'], ['ext-text', 'ext-bg'], ['ext-muted', 'ext-bg'],
]
for (const [fg, bg] of PAIRS) {
  const a = hex(fg), b = hex(bg)
  if (!a || !b) { errors.push(`globals.css is missing --${a ? bg : fg}`); continue }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  const ratio = (hi + 0.05) / (lo + 0.05)
  if (ratio < 4.5) errors.push(`contrast --${fg} on --${bg} is ${ratio.toFixed(2)}:1, needs 4.5`)
}

// ── Rendered pages ───────────────────────────────────────────────────────────
const base = process.env.BASE_URL
if (base) {
  const PAGES = ['/', '/for/linkedin', '/guides', '/guides/what-is-an-ats-score', '/about', '/auth', '/privacy', '/terms', '/support']
  for (const p of [...PAGES, '/this-page-does-not-exist']) {
    const res = await fetch(base + p)
    const html = await res.text()
    const want = p === '/this-page-does-not-exist' ? 404 : 200
    if (res.status !== want) errors.push(`${p} returned ${res.status}, expected ${want}`)
    if (/Bodoni|Hanken|Plus Jakarta/i.test(html)) errors.push(`${p} still references a retired font`)
  }
  const home = await (await fetch(base + '/')).text()
  if (!home.includes('Your resume and cover letter, tailored to every job')) errors.push('/ is missing the H1')
  for (const type of ['"Organization"', '"WebSite"', '"SoftwareApplication"', '"HowTo"', '"FAQPage"', '"SpeakableSpecification"']) {
    if (!home.includes(type)) errors.push(`/ is missing ${type} JSON-LD`)
  }
  if (!home.includes('data-hero-stage')) errors.push('/ is missing the hero product stage')
  // Stats render their final values in HTML; the count-up only animates them.
  for (const v of ['2.1', '97.8', '7.4', '40']) {
    if (!new RegExp(`data-stat[^>]*>${v.replace('.', '\\.')}<`).test(home)) errors.push(`/ stats row is missing ${v} in server HTML`)
  }
  for (const board of ['LinkedIn', 'Indeed', 'Greenhouse', 'Lever', 'Workday', 'Ashby', 'BambooHR', 'Workable']) {
    if (!home.includes(board)) errors.push(`/ boards strip is missing ${board}`)
  }
  if (/Any job (board|page)/i.test(home)) errors.push('/ claims automatic reading on any job page')
  if (!/<div[^>]*inert=""[^>]*aria-hidden="true"|<div[^>]*aria-hidden="true"[^>]*inert=""/.test(home)) {
    errors.push('/ decorative product visuals must be inert so fake buttons are not focusable')
  }
}

if (errors.length) {
  console.error(errors.join('\n'))
  console.error(`\n${errors.length} brand check failure(s)`)
  process.exit(1)
}
console.log('brand check passed')
