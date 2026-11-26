import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright'
const [out] = process.argv.slice(2)
const dist = resolve('dist')
const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'cm-rec-')), {
  channel: 'chromium', headless: true, viewport: { width: 1400, height: 900 },
  args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
  recordVideo: { dir: out, size: { width: 1400, height: 900 } },
})
const sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker')
const base = `chrome-extension://${new URL(sw.url()).host}/src`
const page = ctx.pages()[0] ?? await ctx.newPage()
await page.goto(`${base}/popup/index.html`)
const resume = { name: 'Jordan Reyes', headline: 'Senior Backend Engineer', phone: '(555) 014-2290', email: 'jordan.reyes@example.com', website: '', location: 'Halifax, NS',
  summary: 'Backend engineer with eight years building payment and logistics services.',
  experience: [{ title: 'Senior Backend Engineer', company: 'Harbourline Freight', location: 'Halifax, NS', dates: 'Mar 2021 – Present', bullets: ['Built a Kafka shipment pipeline handling 4M events a day.'] }],
  education: [{ institution: 'Dalhousie University', degree: 'BSc, Computer Science', location: 'Halifax, NS', dates: '2013 – 2017', bullets: [] }], skills: 'Go, Python, Kafka' }
await page.evaluate(async (r) => { await chrome.storage.local.clear(); await chrome.storage.local.set({ settings: { mode: 'hosted' }, cachedTier: 'hosted_pro', tailoredHistory: [{ id: 'g1', job: { title: 'Senior Backend Engineer', company: 'Northwind Logistics', url: 'https://jobs.example/1', description: 'x' }, resume: r, createdAt: '2026-11-20T15:00:00.000Z' }] }) }, resume)
await page.goto(`${base}/editor/index.html?id=g1`)
await page.locator('.ed-pages canvas').first().waitFor()
await page.locator('summary', { hasText: 'Template' }).click()
await page.waitForTimeout(800)
for (const t of ['Modern', 'Classic', 'Modern', 'Minimal']) {
  await page.getByText(t, { exact: true }).click()
  await page.waitForTimeout(1100)
}
await page.close()
await ctx.close()
