// Usage: node proof-269.mjs <playwright module path> <before url> <after url> <out dir>
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'

const [pwPath, beforeUrl, afterUrl, out] = process.argv.slice(2)
const { chromium, devices } = createRequire(import.meta.url)(pwPath)

const browser = await chromium.launch({ channel: 'chrome' })
const VIEWS = {
  desktop: { viewport: { width: 1280, height: 900 } },
  phone: devices['Pixel 7'],
}
const RATING = /^\d\.\d on the Chrome Web Store$/

async function capture(label, url, view) {
  const ctx = await browser.newContext(VIEWS[view])
  const page = await ctx.newPage()
  await page.goto(url, { waitUntil: 'networkidle', timeout: 180_000 })
  const jsonLd = await page.$$eval('script[type="application/ld+json"]', (s) => s.map((n) => JSON.parse(n.textContent)))
  const { aggregateRating } = jsonLd.flat().find((b) => b['@type'] === 'SoftwareApplication')
  const section = page.locator('#get-started')
  await section.scrollIntoViewIfNeeded()
  await page.waitForTimeout(1500)
  const rating = section.getByRole('link', { name: RATING })
  const result = {
    ratingCount: aggregateRating.ratingCount,
    ratingValue: aggregateRating.ratingValue,
    ratingLink: (await rating.count()) && (await rating.isVisible()) ? { text: (await rating.innerText()).trim(), href: await rating.getAttribute('href') } : null,
    seeItLinkVisible: await section.getByRole('link', { name: 'See it on the Chrome Web Store' }).isVisible().catch(() => false),
    countOnPage: /\d+ ratings?\b/.test(await page.locator('body').innerText()),
  }
  const column = section.locator(':scope > div > div').first()
  await column.scrollIntoViewIfNeeded()
  assert.equal(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), view === 'phone')
  await column.screenshot({ path: `${out}/${label}-${view}.png` })
  assert.equal(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), view === 'phone')
  await ctx.close()
  console.log(label.padEnd(6), view.padEnd(7), JSON.stringify(result))
  return result
}

for (const view of ['desktop', 'phone']) {
  const before = await capture('before', beforeUrl, view)
  const after = await capture('after', afterUrl, view)
  assert.equal(before.ratingLink, null)
  assert.equal(before.ratingCount, 3)
  assert.equal(after.ratingCount, 5)
  assert.equal(after.ratingLink?.text, `${after.ratingValue.toFixed(1)} on the Chrome Web Store`)
  assert.match(after.ratingLink.href, /^https:\/\/chromewebstore\.google\.com\/detail\/cover-me-ai-resume-tailor\/bpbnopjgjbimdjjdolhkgimllbgamgpi\?.*utm_campaign=closing-rating/)
  assert.equal(after.countOnPage, false)
  assert.equal(after.seeItLinkVisible, false)
  if (view === 'phone') assert.equal(before.seeItLinkVisible, true)
}
console.log('OK')
await browser.close()
