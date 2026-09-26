// Brand regression check for the "Made to measure" redesign.
//
//   node scripts/check-brand.mjs [paths...]   source checks (default: app components lib) + token contrast
//   node scripts/check-brand.mjs --media      media files exist and fit their budgets
//   BASE_URL=http://localhost:3000 node scripts/check-brand.mjs   also checks rendered pages
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'

const errors = []
const args = process.argv.slice(2)
const mediaOnly = args.includes('--media')
const targets = args.filter((a) => !a.startsWith('--'))

// ── Source checks ────────────────────────────────────────────────────────────
const OLD_PALETTE =
  /6366f1|818cf8|4338ca|a5b4fc|e2e8f0|94a3b8|475569|99,\s*102,\s*241|0d1117|13,\s*17,\s*23|161c2e|1e2740|2a3452|Plus Jakarta|255,\s*255,\s*255/i
const BOLD_HEADING = /<h[12]\b[^>]*?font-(extra)?bold/g
const TIMELINE = /animation-?[tT]imeline/

const walk = (p) => (statSync(p).isDirectory() ? readdirSync(p).flatMap((f) => walk(join(p, f))) : [p])
const lineOf = (src, idx) => src.slice(0, idx).split('\n').length

if (!mediaOnly) {
  const files = (targets.length ? targets : ['app', 'components', 'lib'])
    .flatMap(walk)
    .filter((f) => ['.ts', '.tsx', '.css'].includes(extname(f)))

  for (const f of files) {
    const src = readFileSync(f, 'utf8')
    src.split('\n').forEach((line, i) => {
      if (OLD_PALETTE.test(line)) errors.push(`${f}:${i + 1} old palette: ${line.trim().slice(0, 110)}`)
    })
    for (const m of src.matchAll(BOLD_HEADING)) {
      errors.push(`${f}:${lineOf(src, m.index)} bold h1/h2 (headings are Bodoni 500, drop font-bold/extrabold)`)
    }
    if (f.endsWith('.css')) {
      const start = src.indexOf('scroll-driven:start')
      const end = src.indexOf('scroll-driven:end')
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
    ['ink', 'tissue'], ['ink-2', 'tissue'], ['ink-2', 'tissue-2'],
    ['thread', 'tissue'], ['thread-deep', 'tissue-2'], ['tissue', 'thread'], ['chalk', 'tissue-2'],
  ]
  for (const [fg, bg] of PAIRS) {
    const a = hex(fg), b = hex(bg)
    if (!a || !b) { errors.push(`globals.css is missing --${a ? bg : fg}`); continue }
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
    const ratio = (hi + 0.05) / (lo + 0.05)
    if (ratio < 4.5) errors.push(`contrast --${fg} on --${bg} is ${ratio.toFixed(2)}:1, needs 4.5`)
  }
}

// ── Media budgets ────────────────────────────────────────────────────────────
if (mediaOnly || (!targets.length && existsSync('public/media'))) {
  const BUDGET = {
    'hero.mp4': 3_000_000,
    'hero-poster.jpg': 400_000,
    'footer.mp4': 1_500_000,
    'footer-poster.jpg': 300_000,
  }
  for (const [name, max] of Object.entries(BUDGET)) {
    const p = join('public/media', name)
    if (!existsSync(p)) { errors.push(`missing ${p}`); continue }
    const size = statSync(p).size
    if (size > max) errors.push(`${p} is ${(size / 1e6).toFixed(2)} MB, budget ${(max / 1e6).toFixed(2)} MB`)
  }
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
    if (/Plus Jakarta/i.test(html)) errors.push(`${p} still references Plus Jakarta Sans`)
  }
  const home = await (await fetch(base + '/')).text()
  if (!home.includes('One resume doesn')) errors.push('/ is missing the new H1')
  for (const type of ['"Organization"', '"WebSite"', '"SoftwareApplication"', '"HowTo"', '"FAQPage"']) {
    if (!home.includes(type)) errors.push(`/ is missing ${type} JSON-LD`)
  }
  if (!home.includes('poster="/media/hero-poster.jpg"')) errors.push('/ hero video has no poster')
  if ((home.match(/preload="none"/g) ?? []).length < 2) errors.push('/ videos must use preload="none"')
  if (!home.includes('rises from 52% to 78%')) errors.push('/ ATS score is missing its sr-only sentence')
}

if (errors.length) {
  console.error(errors.join('\n'))
  console.error(`\n${errors.length} brand check failure(s)`)
  process.exit(1)
}
console.log('brand check passed')
