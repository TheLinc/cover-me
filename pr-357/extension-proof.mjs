// node extension-proof.mjs <label> <extension dist dir> <out prefix>
// Loads a local build, shows the answer box on a made-up application form,
// and sends a popup-only message (CHECK_DESIGN) from the page's content script
// and from the popup. No AI provider is called: the box gets its answer
// through the same messages the service worker sends.
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire('F:/worktrees/cover-me/t3-955f3925-91847d0f48c28ccc/extension/package.json')
const { chromium } = require('playwright')

const [label, dist, out] = process.argv.slice(2)
const ext = mkdtempSync(join(tmpdir(), 'cm-ext-'))
cpSync(dist, ext, { recursive: true })
const manifest = JSON.parse(readFileSync(join(ext, 'manifest.json'), 'utf8'))
manifest.host_permissions = [...manifest.host_permissions, 'http://127.0.0.1/*']
writeFileSync(join(ext, 'manifest.json'), JSON.stringify(manifest))

const form = readFileSync(new URL('./form.html', import.meta.url))
const server = createServer((_, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end(form) }).listen(8357)

const profile = mkdtempSync(join(tmpdir(), 'cm-profile-'))
const context = await chromium.launchPersistentContext(profile, {
  channel: 'chromium', headless: true, viewport: { width: 1100, height: 640 },
  args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
})
try {
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker')
  const extId = new URL(worker.url()).host
  for (const p of context.pages()) if (p.url().startsWith('chrome-extension://')) await p.close()

  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  const contexts = []
  cdp.on('Runtime.executionContextCreated', (e) => contexts.push(e.context))
  await cdp.send('Runtime.enable')
  await page.goto('http://127.0.0.1:8357/apply')
  await page.focus('textarea')

  await worker.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ url: 'http://127.0.0.1:8357/*' })
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] })
    const id = 'proof'
    await chrome.tabs.sendMessage(tab.id, { type: 'ANSWER_START', id })
    const jobs = [
      { title: 'Warehouse Supervisor', company: 'Northwind Traders', description: 'Lead the night shift.', url: 'http://127.0.0.1:8357/jobs/42' },
      { title: 'Shift Lead', company: 'Contoso Logistics', description: 'Run the morning shift.', url: 'https://jobs.contoso-example.com/7' },
    ]
    await chrome.tabs.sendMessage(tab.id, { type: 'ANSWER_DONE', id, answer: 'I have led a twelve-person night shift for two years and want to grow with a depot that trains its people.', job: jobs[0], jobs, jobSource: 'page' })
  })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${out}-answer-box.png` })

  const hostTag = await page.evaluate(() => document.documentElement.lastElementChild?.tagName)
  const isolated = contexts.filter((c) => c.origin === `chrome-extension://${extId}`).at(-1)
  const send = `chrome.runtime.sendMessage({ type: 'CHECK_DESIGN', hash: 'proof' }).then((r) => r === undefined ? 'no reply' : JSON.stringify(r), (e) => 'error: ' + e.message)`
  const fromContentScript = (await cdp.send('Runtime.evaluate', { expression: send, contextId: isolated.id, awaitPromise: true })).result.value

  const popup = await context.newPage()
  await popup.goto(`chrome-extension://${extId}/src/popup/index.html`)
  const fromPopup = await popup.evaluate(send)

  const result = { build: label, answerBoxHost: hostTag, checkDesignFromContentScript: fromContentScript, checkDesignFromPopup: fromPopup }
  console.log(JSON.stringify(result, null, 2))
  writeFileSync(`${out}-messages.json`, JSON.stringify(result, null, 2))
} finally {
  await context.close()
  server.close()
  rmSync(profile, { recursive: true, force: true })
  rmSync(ext, { recursive: true, force: true })
}
