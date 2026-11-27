// node walk2.mjs before|after <extension dist>
// BYOK popup, same steps on both builds:
//   1. upload a PDF on the Resume tab, then press Download if there is one
//   2. the Generate tab
//   3. History with a letter and a tailored resume made from that upload
import { createRequire } from 'node:module'
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const require = createRequire('F:/worktrees/cover-me/t3-c59daae8-f7aff07b29605f3f/extension/package.json')
const { chromium } = require('playwright')

const [phase, dist] = process.argv.slice(2)
const after = phase === 'after'
const HERE = new URL('.', import.meta.url).pathname.replace(/^\/(\w:)/, '$1')
const EXT = `${HERE}ext2`
const PROF = `${HERE}profile2-${phase}`
const OUT = `${HERE}out2`
const PDF = `${HERE}Robin Example Resume.pdf`
mkdirSync(OUT, { recursive: true })
rmSync(EXT, { recursive: true, force: true })
rmSync(PROF, { recursive: true, force: true })
cpSync(dist, EXT, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = {}
const ctx = await chromium.launchPersistentContext(PROF, {
  channel: 'chromium', headless: false, viewport: { width: 380, height: 640 }, acceptDownloads: true,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'],
})
const sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker')
const id = new URL(sw.url()).host
const popup = ctx.pages()[0] ?? await ctx.newPage()
await popup.goto(`chrome-extension://${id}/src/popup/index.html`)
await sleep(1500)
for (const p of ctx.pages()) if (p.url().includes('/src/welcome/')) await p.close()

const local = (k) => popup.evaluate(async (key) => chrome.storage.local.get(key), k)
const shot = (name) => popup.screenshot({ path: `${OUT}/${phase}-${name}.png` })
async function open(page) {
  await popup.evaluate((p) => chrome.storage.local.set({ activePage: p }), page)
  await popup.reload()
  await sleep(2500)
}

await popup.evaluate(() => chrome.storage.local.set({ settings: { provider: 'claude', apiKey: 'not-a-real-key', mode: 'byok' }, pageReadAgreed: false, answersNews: 'seen' }))

// 1. Upload, then Download.
await open('resume')
await popup.locator('input[type=file]').setInputFiles(PDF)
for (let i = 0; i < 40 && !(await local('resume')).resume?.text; i++) await sleep(250)
await sleep(3000)
const download = popup.getByRole('button', { name: 'Download Robin Example Resume.pdf' })
log.downloadButton = await download.count() > 0
await shot('1-resume')
assert.equal(log.downloadButton, after)
if (after) {
  const [file] = await Promise.all([popup.waitForEvent('download'), download.click()])
  const saved = `${OUT}/downloaded.pdf`
  await file.saveAs(saved)
  log.downloaded = { name: file.suggestedFilename(), sameBytes: Buffer.compare(readFileSync(saved), readFileSync(PDF)) === 0 }
  assert.deepEqual(log.downloaded, { name: 'Robin Example Resume.pdf', sameBytes: true })
}

// 2. Generate.
await open('generate')
log.usingLine = (await popup.locator('.using-line').first().textContent().catch(() => null)) ?? null
await shot('2-generate')
assert.equal(!!log.usingLine, after)

// 3. History, made from this upload.
const resume = (await local('resume')).resume
await popup.evaluate(async (r) => {
  const source = { filename: r.filename, uploadedAt: r.uploadedAt ?? r.updatedAt, ...(r.file ? { fileId: r.file.id } : {}) }
  const job = { title: 'Backend Engineer', company: 'Northwind Traders', url: 'https://jobs.example.com/northwind/42', description: 'x' }
  const tailored = { name: 'Robin Example', email: 'robin@example.com', phone: '', website: '', experience: [], education: [], source }
  await chrome.storage.local.set({
    history: [{ id: 'l1', job, letter: 'Dear hiring team,', createdAt: new Date().toISOString(), source }],
    tailoredHistory: [{ id: 't1', job, resume: tailored, createdAt: new Date().toISOString() }],
  })
}, resume)
await open('history')
await popup.getByRole('button', { name: 'View' }).first().click()
await sleep(800)
log.fromLines = await popup.locator('.artifact-source').allTextContents()
await shot('3-history')
assert.equal(log.fromLines.length, after ? 2 : 0)

writeFileSync(`${OUT}/${phase}.json`, JSON.stringify(log, null, 2))
console.log(phase, JSON.stringify(log, null, 2))
await ctx.close()
rmSync(PROF, { recursive: true, force: true })
