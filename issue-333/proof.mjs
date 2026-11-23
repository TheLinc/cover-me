// Usage: node proof.mjs <before|after> <baseUrl> <outDir>
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
const require = createRequire('F:/scratch/ai-visibility/package.json')
const { chromium } = require('playwright')

const [label, base, out] = process.argv.slice(2)
const after = label === 'after'
const GUIDE = '/guides/workday-application-status'
const shot = (page, n, step, opts = {}) => page.screenshot({ path: `${out}/${label}-${n}-${step}.png`, ...opts })

const browser = await chromium.launch()
const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } })

await desktop.goto(`${base}/for/workday`, { waitUntil: 'networkidle' })
const back = desktop.locator(`main a[href="${GUIDE}"]`)
assert.equal(await back.count(), after ? 1 : 0, '/for/workday link to the guide')
await desktop.locator('h1').scrollIntoViewIfNeeded()
await shot(desktop, 1, 'for-workday', { clip: { x: 0, y: 60, width: 1280, height: 760 } })

const res = await desktop.goto(`${base}${GUIDE}`, { waitUntil: 'networkidle' })
assert.equal(res.status(), after ? 200 : 404, 'guide status code')
await shot(desktop, 2, 'guide-top')
if (after) {
  const h1s = await desktop.locator('h1').allTextContents()
  assert.equal(h1s.length, 1)
  assert.match(h1s[0], /Workday application status/i)
  const title = await desktop.title()
  assert.ok(title.length < 60, `title "${title}" is ${title.length} chars`)
  const rows = desktop.locator('table tbody tr')
  assert.ok((await rows.count()) >= 4)
  for (const row of await rows.all()) assert.ok((await row.locator('a[href^="https://"]').count()) >= 1, 'row has a source link')
  assert.equal(await desktop.locator('a[href="/for/workday"]').count() >= 1, true, 'guide links to /for/workday')
  await desktop.locator('table').scrollIntoViewIfNeeded()
  await desktop.locator('figure', { has: desktop.locator('table') }).screenshot({ path: `${out}/${label}-3-status-table.png` })
  await desktop.locator('#what-completed-means-in-workday').scrollIntoViewIfNeeded()
  await desktop.evaluate(() => window.scrollBy(0, -90))
  await shot(desktop, 4, 'completed-section')
  console.log('title:', title, `(${title.length})`)
}

await desktop.goto(`${base}/guides`, { waitUntil: 'networkidle' })
const card = desktop.locator(`a[href="${GUIDE}"]`)
assert.equal((await card.count()) > 0, after, '/guides lists the guide')
if (after) {
  await card.first().scrollIntoViewIfNeeded()
  await desktop.evaluate(() => window.scrollBy(0, -200))
}
await shot(desktop, 5, 'guides-index')

const sitemap = await (await desktop.request.get(`${base}/sitemap.xml`)).text()
const llms = await (await desktop.request.get(`${base}/llms.txt`)).text()
const url = `https://www.cover-me.dev${GUIDE}`
assert.equal(sitemap.includes(`<loc>${url}</loc>`), after, 'sitemap entry')
assert.equal(llms.includes(`${url})`), after, 'llms.txt entry')
console.log('sitemap has guide:', sitemap.includes(url), '| llms.txt has guide:', llms.includes(url))
console.log('llms.txt line:', llms.split('\n').find((l) => l.includes(GUIDE)) ?? '(none)')

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
await mobile.goto(`${base}${GUIDE}`, { waitUntil: 'networkidle' })
await shot(mobile, 6, 'guide-mobile')
if (after) {
  await mobile.locator('table').scrollIntoViewIfNeeded()
  await shot(mobile, 7, 'table-mobile')
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  assert.ok(overflow <= 0, `page scrolls sideways by ${overflow}px`)
}

await browser.close()
console.log(label, 'ok')
