// Usage: node proof.mjs <before|after> <baseUrl> <outDir>
import assert from 'node:assert/strict'
import { chromium } from '../tools/node_modules/playwright-core/index.mjs'

const [label, base, out] = process.argv.slice(2)
const after = label === 'after'
const GUIDE = '/guides/best-chrome-extensions-for-job-applications'
const shot = (page, n, step, opts = {}) => page.screenshot({ path: `${out}/${label}-${n}-${step}.png`, ...opts })
const goto = (page, path) => page.goto(`${base}${path}`, { waitUntil: 'networkidle', timeout: 180_000 })

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } })

const res = await goto(desktop, GUIDE)
assert.equal(res.status(), after ? 200 : 404, 'guide status code')
await shot(desktop, 1, 'guide-top')

if (after) {
  const title = await desktop.title()
  assert.match(title, /Chrome extensions/i)
  assert.match(title, /job applications/i)
  const h1s = await desktop.locator('h1').allTextContents()
  assert.equal(h1s.length, 1)
  assert.match(h1s[0], /Chrome extensions for job applications/i)
  assert.ok((await desktop.locator('main').innerText()).includes('November 27, 2026'), 'test date shown')

  const rows = desktop.locator('table tbody tr')
  assert.equal(await rows.count(), 9, 'nine extensions in the table')
  for (const row of await rows.all()) {
    const name = await row.locator('td').first().innerText()
    assert.equal(await row.locator('a[href^="https://chromewebstore.google.com/detail/"]').count(), 1, `${name}: store link`)
    assert.ok((await row.locator('td').nth(1).locator('a').count()) === 1, `${name}: free plan cites a source`)
    assert.ok((await row.locator('td').nth(3).innerText()).length > 5, `${name}: names job sites`)
  }
  const figure = desktop.locator('figure', { has: desktop.locator('table') })
  const box = await figure.boundingBox()
  const scrollY = await desktop.evaluate(() => window.scrollY)
  await desktop.screenshot({ path: `${out}/${label}-2-table.png`, fullPage: true, clip: { ...box, y: box.y + scrollY } })
  const wrap = desktop.locator('figure div.overflow-x-auto')
  assert.ok(await wrap.evaluate((el) => el.scrollWidth <= el.clientWidth), 'table fits the desktop column without scrolling')

  const coverMe = desktop.locator('#resume-tailoring-and-cover-letters-cover-me')
  for (const b of ['linkedin', 'indeed', 'greenhouse', 'lever', 'workday', 'ashby']) {
    assert.equal(await desktop.locator(`main a[href="/for/${b}"]`).count() >= 1, true, `links /for/${b}`)
  }
  assert.ok((await desktop.locator('main a[href*="utm_campaign=guide-extensions"]').count()) >= 2, 'Cover Me store links are tagged')
  await coverMe.scrollIntoViewIfNeeded()
  await desktop.evaluate(() => window.scrollBy(0, -90))
  await shot(desktop, 3, 'cover-me-entry')
  console.log('title:', title)
}

for (const [n, from, step] of [[4, '/guides/jobright-review', 'jobright-review-link'], [5, '/guides/free-jobscan-alternatives', 'jobscan-alternatives-link']]) {
  await goto(desktop, from)
  const link = desktop.locator(`main a[href="${GUIDE}"]`)
  assert.equal(await link.count(), after ? 1 : 0, `${from} links to the guide`)
  const para = desktop.locator('main p', { hasText: from.includes('jobright') ? 'tracker and 4 autofills a day' : 'If you only want a score' })
  await para.first().scrollIntoViewIfNeeded()
  await para.first().screenshot({ path: `${out}/${label}-${n}-${step}.png` })
}

const sitemap = await (await desktop.request.get(`${base}/sitemap.xml`)).text()
const llms = await (await desktop.request.get(`${base}/llms.txt`)).text()
const url = `https://www.cover-me.dev${GUIDE}`
assert.equal(sitemap.includes(`<loc>${url}</loc>`), after, 'sitemap entry')
assert.equal(llms.includes(`${url})`), after, 'llms.txt entry')
console.log('sitemap has guide:', sitemap.includes(url), '| llms.txt has guide:', llms.includes(url))
console.log('llms.txt line:', llms.split('\n').find((l) => l.includes(GUIDE)) ?? '(none)')

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
await goto(mobile, GUIDE)
await shot(mobile, 6, 'guide-mobile')
if (after) {
  const scrollWidth = await mobile.evaluate(() => document.documentElement.scrollWidth)
  assert.ok(scrollWidth <= 390, `no page-level horizontal scroll on mobile (${scrollWidth})`)
  await mobile.locator('table').scrollIntoViewIfNeeded()
  await mobile.evaluate(() => window.scrollBy(0, -120))
  await shot(mobile, 7, 'table-mobile')
}

await browser.close()
console.log(label, 'ok')
