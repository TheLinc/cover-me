// Renders the real logos read from live Google, Apple, Amazon and LinkedIn postings in the built posting card.
// Only the fixture page is routed: a context-wide route makes Playwright cancel /favicon.ico image loads.
import { mkdtempSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const [extDir, outDir] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const { chromium } = await import(pathToFileURL(join(extDir, 'node_modules/playwright/index.mjs')).href)
const dist = resolve(extDir, 'dist')
const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'cm346c-')), { channel: 'chromium', headless: false, viewport: { width: 420, height: 640 }, args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`] })
const sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker')
await sw.evaluate(() => { self.fetch = async () => new Response('{}', { status: 503 }) })
const popupUrl = `chrome-extension://${new URL(sw.url()).host}/src/popup/index.html`
const DESC = 'A made-up description long enough for the scraper: build and run the systems behind the product, work with a small team, write clearly, review code, and own what you ship from design to production support.'
const LIVE = [
  ['google', 'Google', 'Networking Silicon Architect, Google Cloud', 'https://www.google.com/favicon.ico'],
  ['apple', 'Apple', 'US - Specialist', 'https://jobs.apple.com/static/favicon.ico'],
  ['amazon', 'Amazon', 'Software Engineer I', 'https://static.amazon.jobs/assets/favicon-933ee4605ae64f3181e0fcd88f9205be7b5f8a15643c342e53a9f03bb673732c.ico'],
  ['linkedin', 'Intuit', 'Software Developer 1', 'https://media.licdn.com/dms/image/v2/D4E0BAQFhO7AJbDCP8w/company-logo_100_100/B4EaCG6NZ_JQAI-/0/1788969801591/intuit_logo?e=1797465600&v=beta&t=p3VyZ4sKpiXjJOjGLe5Dq98-zw_m99sEYqUaa7c-MGc'],
]
for (const [name, company, title, logo] of LIVE) {
  const url = `https://job-boards.greenhouse.io/fernbrookanalytics/jobs/${name}`
  const page = await ctx.newPage()
  await page.route(url, (r) => r.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head><script type="application/ld+json">${JSON.stringify({ '@type': 'JobPosting', title, hiringOrganization: { name: company, logo }, description: DESC })}</script></head><body><h1>${title}</h1></body></html>` }))
  await page.goto(url)
  const popup = await ctx.newPage()
  await popup.goto(popupUrl)
  await popup.evaluate(async (url) => {
    await chrome.storage.local.set({
      session: { access_token: 'fake-token', refresh_token: 'fake', expires_at: 4102444800, user: { id: '00000000-0000-0000-0000-000000000346', email: 'sam.rivera@example.com' } },
      pageReadAgreed: true, answersNews: 'seen',
      resume: { text: 'Sam Rivera. Backend engineer.', filename: 'resume.pdf', updatedAt: new Date().toISOString() },
      generatePage: { state: 'idle', inputMode: 'auto' },
    })
    const [tab] = await chrome.tabs.query({ url })
    await chrome.windows.create({ tabId: tab.id, focused: true })
  }, url)
  await popup.reload()
  await popup.getByText(title, { exact: true }).waitFor()
  await popup.waitForTimeout(2000)
  const img = popup.locator('img.posting-logo')
  const shown = (await img.count()) ? await img.evaluate((i) => `image ${i.naturalWidth}x${i.naturalHeight}`) : 'letter ' + await popup.locator('.posting-logo').innerText()
  await popup.locator('.posting-card').screenshot({ path: join(outDir, `live-${name}.png`) })
  console.log(name, shown)
  await popup.close(); await page.close()
}
await ctx.close()
