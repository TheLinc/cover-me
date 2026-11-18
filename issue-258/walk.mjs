// Proof for #258: an own-key tailor's parse must not land on a resume uploaded while it runs.
//   node walk.mjs before|after
// before = origin/master build, after = the fix branch build. Fresh profile each run.
// Playwright holds the first model call (the parse of Jordan's resume) until Sam's resume is
// stored, then lets it through to the real API. The second tailor then shows whose parse it used.
import { createRequire } from 'node:module'
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
const require = createRequire('F:/worktrees/cover-me/t3-b23cad76/extension/package.json')
const { chromium } = require('playwright')

const phase = process.argv[2]
if (!['before', 'after'].includes(phase)) throw new Error('usage: walk.mjs before|after')
const ROOT = 'F:/tmp-wt258'
const DIST = phase === 'before' ? `${ROOT}/before/extension/dist` : 'F:/worktrees/cover-me/t3-b23cad76/extension/dist'
const EXT = `${ROOT}/ext-${phase}`, PROF = `${ROOT}/prof-${phase}`, OUT = `${ROOT}/out`
mkdirSync(OUT, { recursive: true })
for (const d of [EXT, PROF]) rmSync(d, { recursive: true, force: true })
cpSync(DIST, EXT, { recursive: true })
const m = JSON.parse(readFileSync(`${EXT}/manifest.json`, 'utf8'))
writeFileSync(`${EXT}/manifest.json`, JSON.stringify({ ...m, host_permissions: [...m.host_permissions, 'http://localhost:8258/*'] }))

const jobHtml = readFileSync(`${ROOT}/job.html`)
const server = createServer((_, res) => { res.setHeader('content-type', 'text/html'); res.end(jobHtml) }).listen(8258)
const KEY = readFileSync('F:/personal-projects/cover-me/backend/supabase/functions/.env', 'utf8').match(/^ANTHROPIC_API_KEY=(.*)$/m)[1].trim()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = {}
const note = (k, v) => { log[k] = v; console.log(`${k}:`, JSON.stringify(v)) }
const shot = (p, name) => p.screenshot({ path: `${OUT}/${phase}-${name}.png` })

const ctx = await chromium.launchPersistentContext(PROF, {
  channel: 'chromium', headless: false, viewport: { width: 1280, height: 800 },
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'],
})
let release, held = false, calls = 0
const gate = new Promise((r) => { release = r })
await ctx.route('https://api.anthropic.com/**', async (route) => {
  calls++
  if (!held) { held = true; console.log('holding the first model call (the parse)'); await gate }
  await route.continue()
})

const sw = ctx.serviceWorkers().find((w) => w.url().endsWith('/service-worker-loader.js'))
  ?? await ctx.waitForEvent('serviceworker', { predicate: (w) => w.url().endsWith('/service-worker-loader.js') })
const id = new URL(sw.url()).host
const popup = ctx.pages()[0] ?? await ctx.newPage()
await popup.setViewportSize({ width: 380, height: 600 })
await popup.goto(`chrome-extension://${id}/src/popup/index.html`)
for (let i = 0; i < 15; i++) { const w = ctx.pages().find((x) => x.url().includes('/src/welcome/')); if (w) { await w.close(); break } await sleep(200) }
const local = (k) => popup.evaluate(async (k) => chrome.storage.local.get(k), k)
const nav = (name) => popup.getByRole('button', { name, exact: true }).click()
async function until(fn, secs, what) {
  for (let i = 0; i < secs * 2; i++) { const v = await fn(); if (v) return v; await sleep(500) }
  await shot(popup, 'timeout').catch(() => {})
  console.log('popup text:', (await popup.locator('body').innerText()).slice(0, 800))
  throw new Error(`timed out: ${what}`)
}
const companies = (r) => (r?.experience ?? []).map((e) => e.company)
async function upload(file) {
  await nav('Resume'); await sleep(800)
  await popup.locator('input[type=file]').setInputFiles(file)
  const name = file.split('/').pop()
  await until(async () => (await local('resume')).resume?.filename === name, 30, `${name} stored`)
  await sleep(1000)
}

// Own-key setup with Jordan's resume.
await sleep(1000)
const agree = popup.getByRole('button', { name: 'Agree' })
if (await agree.count()) await agree.click()
await nav('Settings'); await sleep(800)
await popup.getByRole('button', { name: /I have an API key/ }).click(); await sleep(400)
await popup.locator('input.form-input.with-eye').fill(KEY)
await popup.locator('button.btn.btn-primary').first().click()
await until(async () => (await local('settings')).settings?.mode === 'byok', 10, 'own-key saved')
await upload(`${ROOT}/jordan-avery.pdf`)
note('1. Jordan uploaded, stored parse', (await local('resume')).resume.parsed ?? null)

await popup.evaluate(async () => { await chrome.windows.create({ url: 'http://localhost:8258/job', focused: true, left: 0, top: 0, width: 1200, height: 800 }) })
const job = await until(() => ctx.pages().find((x) => x.url().startsWith('http://localhost:8258')), 20, 'job page')
await job.waitForLoadState('load')

async function tailor(label, during) {
  const prev = (await local('tailorJob')).tailorJob?.id
  await popup.evaluate(() => chrome.storage.local.remove(['tailorJob', 'generatePage']))
  await popup.reload(); await sleep(1200)
  await nav('Generate'); await sleep(800)
  await popup.getByRole('button', { name: /Tailor Resume to Job/ }).click()
  if (during) await during()
  const j = await until(async () => {
    const t = (await local('tailorJob')).tailorJob
    return t && t.id !== prev && (t.status === 'done' || t.status === 'error') ? t : null
  }, 240, `tailor ${label}`)
  if (j.status === 'error') throw new Error(`tailor ${label} failed: ${j.error}`)
  return j
}

// 2. First tailor: while it reads Jordan's resume, Sam's is uploaded.
const first = await tailor('1', async () => {
  await until(() => held, 30, 'parse call')
  await upload(`${ROOT}/sam-rivera.pdf`)
  await shot(popup, '1-sam-uploaded-during-parse')
  release()
})
note('2. first tailor (started with Jordan) used', companies(first.resume))
await sleep(1500)
const stored = (await local('resume')).resume
note('3. stored resume after the first tailor', { filename: stored.filename, parsedCompanies: stored.parsed ? companies(stored.parsed) : null })
await nav('Resume'); await sleep(800)
await shot(popup, '2-resume-page-after-first-tailor')

// 4. Second tailor, Sam's resume is the stored one.
const second = await tailor('2')
note('4. second tailor (Sam stored) used', companies(second.resume))
await sleep(1000)
await shot(popup, '3-second-tailor-result')
const ed = await ctx.newPage()
await ed.setViewportSize({ width: 1100, height: 900 })
await ed.goto(`chrome-extension://${id}/src/editor/index.html?id=${second.entryId}`)
await sleep(3000)
await shot(ed, '4-second-tailor-in-editor')
note('model calls', calls)

const jordanJobs = (c) => c.some((x) => /Northwind|Contoso/.test(x))
const samJobs = (c) => c.some((x) => /Fabrikam|Tailspin/.test(x))
const c2 = companies(second.resume)
const ok = phase === 'before'
  ? stored.parsed && jordanJobs(companies(stored.parsed)) && jordanJobs(c2) && !samJobs(c2)
  : !stored.parsed && samJobs(c2) && !jordanJobs(c2) && jordanJobs(companies(first.resume))
note('assert', phase === 'before' ? 'bug shows: Sam\'s resume kept Jordan\'s parse, second tailor used Jordan\'s jobs' : 'fixed: Sam\'s resume had no parse, second tailor used Sam\'s jobs, first finished with Jordan\'s')
writeFileSync(`${OUT}/${phase}.json`, JSON.stringify(log, null, 2))
await ctx.close(); server.close()
if (!ok) { console.error('ASSERTION FAILED'); process.exit(1) }
console.log('PASS')
