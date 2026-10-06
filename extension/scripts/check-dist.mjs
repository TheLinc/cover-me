// Post-build guard on dist/ for the on-click scraping model.
//
//   node scripts/check-dist.mjs
//
// Fails if the built extension runs code on pages the user hasn't clicked on,
// asks for broader host access than the embedded-ATS list, or if the content
// script that the background injects on click can't be injected as a file.
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist'
const errors = []
const manifest = JSON.parse(readFileSync(join(DIST, 'manifest.json'), 'utf8'))

if (manifest.content_scripts?.length) {
  errors.push(`manifest declares content_scripts (${manifest.content_scripts.map((c) => c.matches).flat().join(', ')}); scrapers must be injected on click`)
}

const broad = (p) => /<all_urls>|^\*:\/\/\*\/|^https?:\/\/\*\/\*$/.test(p)
for (const p of [...(manifest.host_permissions ?? []), ...(manifest.optional_host_permissions ?? [])]) {
  if (broad(p)) errors.push(`broad host permission: ${p}`)
}
for (const war of manifest.web_accessible_resources ?? []) {
  if ((war.matches ?? []).some(broad)) errors.push(`web_accessible_resources exposed to all sites: ${war.resources.join(', ')}`)
}

// Embedded ATS iframes need host access because activeTab only covers the main frame.
const ATS = ['greenhouse.io', 'lever.co', 'myworkdayjobs.com', 'ashbyhq.com', 'bamboohr.com', 'workable.com']
for (const host of ATS) {
  if (!manifest.host_permissions?.includes(`https://*.${host}/*`)) errors.push(`missing host permission https://*.${host}/*`)
}

// The service worker must reference the content-script file it injects, and
// that file must be a classic script (executeScript can't run an ES module).
// CRXJS's service worker is a loader that imports the real background chunk.
const loader = readFileSync(join(DIST, manifest.background.service_worker), 'utf8')
const sw = [loader, ...[...loader.matchAll(/import\s*["']\.?\/?([^"']+\.js)["']/g)].map((m) => readFileSync(join(DIST, m[1]), 'utf8'))].join('\n')
const injected = [...sw.matchAll(/["']([\w./-]*content[\w.-]*\.js)["']/g)].map((m) => m[1])
if (injected.length === 0) {
  errors.push('service worker does not reference an injectable content-script file')
} else {
  for (const file of new Set(injected)) {
    const path = join(DIST, file)
    if (!existsSync(path)) { errors.push(`injected file missing: ${file}`); continue }
    const code = readFileSync(path, 'utf8')
    if (/^\s*import[\s{*]/m.test(code) || /^\s*export\s/m.test(code)) {
      errors.push(`injected file ${file} is an ES module; executeScript needs a classic script`)
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'))
  console.error(`\n${errors.length} dist check failure(s)`)
  process.exit(1)
}
console.log('dist check passed')
