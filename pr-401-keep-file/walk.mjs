// node walk.mjs before|after <extension dist>
// BYOK popup, same steps on both builds:
//   1. upload a PDF on the Resume tab
//   2. pretend that upload came from an older reader (old text, readerVersion 1), reopen the popup
//   3. a resume uploaded before files were kept (no stored file), reopen the popup
// Asserts the old behavior on "before" and the new one on "after".
import { createRequire } from 'node:module'
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const require = createRequire('F:/worktrees/cover-me/t3-c59daae8-f7aff07b29605f3f/extension/package.json')
const { chromium } = require('playwright')

const [phase, dist] = process.argv.slice(2)
const after = phase === 'after'
const HERE = new URL('.', import.meta.url).pathname.replace(/^\/(\w:)/, '$1')
const EXT = `${HERE}ext`
const PROF = `${HERE}profile-${phase}`
const OUT = `${HERE}out`
const PDF = `${HERE}Robin Example Resume.pdf`
const LINK = 'github.com/robin-example/shelf'
mkdirSync(OUT, { recursive: true })
rmSync(EXT, { recursive: true, force: true })
rmSync(PROF, { recursive: true, force: true })
cpSync(dist, EXT, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = {}
const ctx = await chromium.launchPersistentContext(PROF, {
  channel: 'chromium', headless: false, viewport: { width: 380, height: 640 },
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'],
})
const sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker')
const id = new URL(sw.url()).host
const popup = ctx.pages()[0] ?? await ctx.newPage()
const url = `chrome-extension://${id}/src/popup/index.html`
await popup.goto(url)
await sleep(1500)
for (const p of ctx.pages()) if (p.url().includes('/src/welcome/')) await p.close()

const local = (k) => popup.evaluate(async (key) => chrome.storage.local.get(key), k)
const files = async () => Object.keys(await popup.evaluate(() => chrome.storage.local.get(null))).filter((k) => k.startsWith('designFile:'))
const shot = (name) => popup.screenshot({ path: `${OUT}/${phase}-${name}.png` })
async function resumeTab() {
  await popup.evaluate(() => chrome.storage.local.set({ activePage: 'resume' }))
  await popup.reload()
  await sleep(2500)
}

await popup.evaluate(() => chrome.storage.local.set({ settings: { provider: 'claude', apiKey: '', mode: 'byok' }, pageReadChoice: false }))

// 1. Upload.
await resumeTab()
await popup.locator('input[type=file]').setInputFiles(PDF)
for (let i = 0; i < 40 && !(await local('resume')).resume?.text; i++) await sleep(250)
await sleep(800)
const uploaded = (await local('resume')).resume
log.upload = { file: uploaded.file ?? null, storedFiles: (await files()).length, readerVersion: uploaded.readerVersion, textHasLink: uploaded.text.includes(LINK) }
await shot('1-upload')
assert.equal(log.upload.storedFiles, after ? 1 : 0)

// 2. The same upload as an older reader left it: no link, readerVersion 1.
const oldText = uploaded.text.replaceAll(LINK, '').replace(/\(\s*\)/g, '')
await popup.evaluate(async (text) => {
  const { resume } = await chrome.storage.local.get('resume')
  await chrome.storage.local.set({ resume: { ...resume, text, readerVersion: 1 } })
}, oldText)
log.seeded = { readerVersion: 1, textHasLink: oldText.includes(LINK) }
await resumeTab()
await sleep(2000)
const reread = (await local('resume')).resume
log.reopened = { readerVersion: reread.readerVersion, textHasLink: reread.text.includes(LINK), words: Math.round(reread.text.length / 5) }
await shot('2-reopened')
assert.equal(log.reopened.textHasLink, after)

// 3. A resume from before files were kept.
await popup.evaluate(async (text) => {
  const all = await chrome.storage.local.get(null)
  await chrome.storage.local.remove(Object.keys(all).filter((k) => k.startsWith('designFile:')))
  await chrome.storage.local.set({ designFiles: [], resume: { text, filename: 'Robin Example Resume.pdf', updatedAt: '2026-10-02T15:00:00.000Z' } })
}, oldText)
await resumeTab()
const note = popup.getByText('Re-upload your resume')
log.note = await note.count() > 0
await shot('3-no-stored-file')
assert.equal(log.note, after)
if (after) {
  await popup.getByRole('button', { name: 'Not now' }).click()
  await resumeTab()
  log.noteAfterNotNow = await note.count() > 0
  await shot('4-after-not-now')
  assert.equal(log.noteAfterNotNow, false)
}

writeFileSync(`${OUT}/${phase}.json`, JSON.stringify(log, null, 2))
console.log(phase, JSON.stringify(log, null, 2))
await ctx.close()
rmSync(PROF, { recursive: true, force: true })
