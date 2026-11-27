// Before/after proof for #346: the Generate tab on a job page and on a page with no posting.
// Usage: node proof.mjs <before|after> <extension dir, built with `corepack pnpm build:local`> <out dir>
// Fixtures are made up and served by page.route; every service-worker fetch is recorded and
// answered with a stub, so nothing reaches a server or an AI.
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const [mode, extDir, outDir] = process.argv.slice(2)
const after = mode === 'after'
const { chromium } = await import(pathToFileURL(join(extDir, 'node_modules/playwright/index.mjs')).href)
mkdirSync(outDir, { recursive: true })

const DESC = 'Fernbrook Analytics is hiring a Platform Engineer to build the data platform behind our forecasting product. You will own ingestion pipelines, a Postgres warehouse and the internal tooling our analysts use every day. We work in TypeScript and Go, deploy on Kubernetes, and value clear writing. 4+ years building backend systems required.'
const JOB_URL = 'https://job-boards.greenhouse.io/fernbrookanalytics/jobs/4821'
const OTHER_URL = 'https://job-boards.greenhouse.io/fernbrookanalytics/blog'
const BROKEN_LOGO_URL = 'https://job-boards.greenhouse.io/fernbrookanalytics/jobs/4822'
const LOGO = 'https://job-boards.greenhouse.io/fernbrookanalytics/logo.svg'
const logoSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0f766e"/><path d="M18 46V18h28v8H27v5h15v8H27v7z" fill="#fff"/></svg>'
const jobPage = (logo) => `<!doctype html><html><head><title>Platform Engineer - Fernbrook Analytics</title>
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'JobPosting', title: 'Platform Engineer', hiringOrganization: { '@type': 'Organization', name: 'Fernbrook Analytics', logo }, description: DESC })}</script>
</head><body><h1>Platform Engineer</h1><p>Fernbrook Analytics</p><div class="description"><p>${DESC}</p></div></body></html>`
const otherHtml = '<!doctype html><html><head><title>Our year at Fernbrook</title></head><body><h1>Our year at Fernbrook</h1><p>We shipped three releases and moved offices.</p></body></html>'

const dist = resolve(extDir, 'dist')
const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'cm346-')), {
  channel: 'chromium', headless: false, viewport: { width: 420, height: 640 },
  args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
})
await ctx.route('https://job-boards.greenhouse.io/fernbrookanalytics/**', (r) => {
  const url = r.request().url()
  if (url === LOGO) return r.fulfill({ contentType: 'image/svg+xml', body: logoSvg })
  if (url.endsWith('/missing.png')) return r.fulfill({ status: 404, body: '' })
  r.fulfill({ contentType: 'text/html', body: url === JOB_URL ? jobPage(LOGO) : url === BROKEN_LOGO_URL ? jobPage(LOGO.replace('logo.svg', 'missing.png')) : otherHtml })
})
const sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker')
await sw.evaluate(() => {
  self.__fetches = []
  self.fetch = async (input) => { self.__fetches.push(String(input instanceof Request ? input.url : input)); return new Response('{}', { status: 503 }) }
})
const fetches = () => sw.evaluate(() => self.__fetches)
const popupUrl = `chrome-extension://${new URL(sw.url()).host}/src/popup/index.html`
const shot = (p, n) => p.locator('body').screenshot({ path: join(outDir, `${mode}-${n}.png`) })
const buttons = (p) => p.locator('.generate-cta .btn-primary, .generate-cta .tailor-section > .btn').allInnerTexts()

// The popup's tab is the active one in its own window, so the page moves to a focused
// window of its own, as it is when the toolbar popup opens over it. "Reading job pages"
// is on (pageReadAgreed), so the click read sends its page copy to the scrape function.
async function openOn(url) {
  const page = await ctx.newPage()
  await page.goto(url)
  const popup = await ctx.newPage()
  await popup.goto(popupUrl)
  await popup.evaluate(async (url) => {
    await chrome.storage.local.set({
      session: { access_token: 'fake-token', refresh_token: 'fake', expires_at: 4102444800, user: { id: '00000000-0000-0000-0000-000000000346', email: 'sam.rivera@example.com' } },
      pageReadAgreed: true,
      answersNews: 'seen',
      resume: { text: 'Sam Rivera. Backend engineer, 5 years of TypeScript and Postgres.', filename: 'resume.pdf', updatedAt: new Date().toISOString() },
      generatePage: { state: 'idle', inputMode: 'auto' },
    })
    const [tab] = await chrome.tabs.query({ url })
    await chrome.windows.create({ tabId: tab.id, focused: true })
  }, url)
  await sw.evaluate(() => { self.__fetches = [] })
  await popup.reload()
  await popup.locator('.generate-cta').waitFor()
  return popup
}

// 1. A job page
let popup = await openOn(JOB_URL)
if (after) await popup.getByText('Platform Engineer', { exact: true }).waitFor()
await popup.waitForTimeout(1500)
await shot(popup, '1-job-page')
assert.equal(await popup.getByText('Fernbrook Analytics · job-boards.greenhouse.io').isVisible(), after)
assert.equal(await popup.getByText('Open a job posting on LinkedIn, Indeed, or any careers page').isVisible(), !after)
if (after) assert.ok(await popup.locator('img.posting-logo').evaluate((img) => img.complete && img.naturalWidth > 0), 'the posting data logo shows')
assert.deepEqual(await fetches(), [], 'opening the popup sends nothing to the server')
console.log(mode, '1 job page: buttons', await buttons(popup))
await popup.close()

// 2. A page with no posting, then each button
popup = await openOn(OTHER_URL)
if (after) await popup.getByText("Couldn't find a job posting here").waitFor()
await popup.waitForTimeout(1500)
await shot(popup, '2-no-posting')
const labels = await buttons(popup)
assert.deepEqual(labels, after ? ['Try anyway: Generate Cover Letter', 'Try anyway: Tailor Resume'] : ['Generate Cover Letter', 'Tailor Resume to Job'])
assert.deepEqual(await fetches(), [], 'opening the popup sends nothing to the server')
await popup.getByRole('button', { name: labels[0] }).click()
await popup.getByText('Could not find job details on this page').waitFor()
assert.deepEqual(await fetches(), [`http://127.0.0.1:54321/functions/v1/scrape`], 'the click read still sends its page copy')
await shot(popup, '3-after-generate-click')
await popup.close()
popup = await openOn(OTHER_URL)
if (after) await popup.getByText("Couldn't find a job posting here").waitFor()
await popup.getByRole('button', { name: labels[1] }).click()
await popup.getByText('Could not find job details on this page').waitFor()
console.log(mode, '2 no posting: both buttons start a read; labels', labels)
await popup.close()

// 4. The placeholder while the read runs, held open by a stalled executeScript
if (after) {
  popup = await openOn(JOB_URL)
  await popup.close()
  await sw.evaluate(() => { self.__exec = chrome.scripting.executeScript; chrome.scripting.executeScript = () => new Promise(() => {}) })
  const p = await ctx.newPage()
  await p.goto(popupUrl)
  await p.locator('.posting-reading').waitFor()
  await p.waitForTimeout(300)
  await shot(p, '4-reading')
  const reading = await p.locator('.posting-reading').boundingBox()
  await sw.evaluate(() => { chrome.scripting.executeScript = self.__exec })
  await p.close()
  popup = await openOn(JOB_URL)
  const found = await popup.locator('.posting-card:not(.posting-reading)').boundingBox()
  assert.equal(reading.height, found.height, 'the placeholder holds the card height')
  await popup.getByRole('button', { name: 'Wrong job? Paste it' }).click()
  assert.ok(await popup.getByPlaceholder('Paste the full job description here…').isVisible())
  await popup.close()
  popup = await openOn(BROKEN_LOGO_URL)
  await popup.getByText('Platform Engineer', { exact: true }).waitFor()
  await popup.locator('span.posting-logo', { hasText: 'F' }).waitFor()
  await shot(popup, '5-logo-fails')
  console.log(mode, '5 a logo that fails to load falls back to the letter')
  console.log(mode, '4 placeholder height', reading.height, '= card', found.height, '; Wrong job? opens the paste form')
}

console.log(mode, 'all assertions passed')
await ctx.close()
