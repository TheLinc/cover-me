import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright'

const [distArg, label, outDir] = process.argv.slice(2)
const JOB = 'https://jobs.lever.co/capital/d59027b2-57d3-4c91-8d45-113a7244822a/apply?lever-source=LinkedIn&source=LinkedIn_apply'
const dist = resolve(distArg)
const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'cover-me-proof-')), {
  channel: 'chromium', headless: false, viewport: { width: 380, height: 560 },
  args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
})
try {
  const sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker')
  const id = new URL(sw.url()).host
  const job = ctx.pages()[0] ?? await ctx.newPage()
  await job.goto(JOB, { waitUntil: 'load' })
  const popup = await ctx.newPage()
  await popup.setViewportSize({ width: 380, height: 560 })
  await popup.goto(`chrome-extension://${id}/src/popup/index.html`)
  await popup.evaluate(async () => {
    await chrome.storage.local.set({
      settings: { provider: 'anthropic', apiKey: 'fake-key-for-proof', mode: 'byok' },
      resume: { text: 'Jordan Lee\nOperations lead, 8 years automating support workflows at Northwind Bank.', filename: 'jordan-lee-resume.pdf', updatedAt: new Date().toISOString() },
      whatsNew: '99.0.0',
    })
  })
  for (const p of ctx.pages()) if (p !== job && p !== popup) await p.close()
  await popup.reload()
  await popup.evaluate(async (url) => {
    const [tab] = await chrome.tabs.query({ url: url.split('?')[0] + '*' })
    await chrome.windows.create({ tabId: tab.id, focused: true })
  }, JOB)
  for (const name of ['Not now', 'Dismiss']) await popup.getByRole('button', { name }).first().click({ timeout: 3000 }).catch(() => {})
  await popup.evaluate(() => {
    const send = chrome.runtime.sendMessage.bind(chrome.runtime)
    // @ts-expect-error proof-only stub: hold the letter request so nothing reaches a model
    chrome.runtime.sendMessage = (m: { type: string }) => m.type === 'GENERATE_FROM_MANUAL' ? new Promise(() => {}) : send(m)
  })
  await popup.getByRole('button', { name: 'Generate Cover Letter' }).first().click()
  await popup.locator('.loading-job-title, .error, [role="alert"]').first().waitFor({ timeout: 30000 }).catch(() => {})
  await popup.waitForTimeout(8000)
  await popup.screenshot({ path: join(outDir, `${label}-1-generate-on-lever-apply.png`) })
  console.log(label, (await popup.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 300))
} finally {
  await ctx.close()
}
