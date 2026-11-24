// Proof for #350: node proof-350.mjs <before|after> <baseUrl> <outDir>
// Asserts the Careerflow review exists only on "after", with its canonical, sitemap and llms.txt entries,
// incoming links from three other reviews, and a source link plus checked-on date for its prices.
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
const require = createRequire('F:/scratch/ai-visibility/package.json')
const { chromium } = require('playwright')

const [mode, base, out] = process.argv.slice(2)
const after = mode === 'after'
const slug = '/guides/careerflow-review'
const prod = `https://www.cover-me.dev${slug}`
const text = async (p) => (await fetch(base + p)).text()

const review = await fetch(base + slug)
assert.equal(review.status, after ? 200 : 404, `${slug} status`)
assert.equal((await text('/sitemap.xml')).includes(prod), after, 'sitemap entry')
assert.equal((await text('/llms.txt')).includes(`(${prod})`), after, 'llms.txt line')
for (const p of ['/guides/teal-review', '/guides/jobright-review', '/guides/jobscan-review', '/guides']) {
  assert.equal((await text(p)).includes(`href="${slug}"`), after, `link from ${p}`)
}

const browser = await chromium.launch()
for (const [name, viewport] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport })
  await page.goto(base + slug, { waitUntil: 'networkidle' })
  await page.screenshot({ path: `${out}/${mode}-1-review-${name}.png` })
  if (after) {
    assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), prod, 'canonical')
    assert.match(await page.locator('h1').innerText(), /Careerflow review/)
    const pricing = page.locator('figure', { hasText: 'Premium Plus' }).first()
    assert.equal(await pricing.locator('a[href="https://www.careerflow.ai/premium"]').count(), 1, 'price table links the pricing page')
    assert.match(await pricing.innerText(), /\$23\.99 a month[\s\S]*checked November 24, 2026/, 'price table has a checked-on date')
    if (name === 'desktop') {
      await pricing.scrollIntoViewIfNeeded()
      await pricing.screenshot({ path: `${out}/${mode}-2-pricing.png` })
      const vsTeal = page.locator('figure', { hasText: 'Teal+' }).first()
      await vsTeal.screenshot({ path: `${out}/${mode}-3-vs-teal.png` })
    }
  }
  await page.close()
}
const teal = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await teal.goto(base + '/guides/teal-review', { waitUntil: 'networkidle' })
const para = teal.locator('p', { hasText: 'For other tools, see the' }).first()
await para.scrollIntoViewIfNeeded()
await para.screenshot({ path: `${out}/${mode}-4-teal-review-link.png` })
await browser.close()
console.log(`${mode}: all assertions passed`)
