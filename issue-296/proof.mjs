// Usage: node proof.mjs <before|after> <baseUrl>
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const require = createRequire('F:/personal-projects/cover-me/extension/package.json')
const { chromium } = require('playwright')

const [label, base] = process.argv.slice(2)
const after = label === 'after'
const out = 'F:/scratch/issue-296/proof/'
const tools = ['aiapply', 'jobscan', 'teal']
const results = { label, base, oldAddresses: {}, titles: {}, incoming: {} }

const browser = await chromium.launch({ channel: 'chrome' })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
const plain = (s) => s.replace(/ \| Cover Me$/, '').trim().toLowerCase()

async function read(path) {
  await page.goto(base + path, { waitUntil: 'networkidle' })
  return { url: new URL(page.url()).pathname, h1: (await page.locator('h1').first().innerText()).trim(), title: await page.title() }
}

for (const [i, tool] of tools.entries()) {
  const old = `/guides/cover-me-vs-${tool}`
  const res = await ctx.request.get(base + old, { maxRedirects: 0 })
  const landed = await read(old)
  await page.screenshot({ path: `${out}${label}-${i + 1}-${tool}.png` })
  results.oldAddresses[tool] = { status: res.status(), location: res.headers().location ?? null, ...landed }
  if (after) {
    assert.equal(res.status(), 308)
    assert.equal(res.headers().location, `/guides/${tool}-review`)
    assert.equal(landed.url, `/guides/${tool}-review`)
  } else {
    assert.equal(res.status(), 200)
    assert.equal(landed.url, old)
  }
}

const slugs = await (async () => {
  await page.goto(base + '/guides', { waitUntil: 'networkidle' })
  await page.screenshot({ path: `${out}${label}-4-guides-index.png`, fullPage: true })
  const hrefs = await page.locator('main a[href^="/guides/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')))
  return [...new Set(hrefs)].map((h) => h.replace('/guides/', ''))
})()

for (const slug of slugs) {
  const { h1, title } = await read(`/guides/${slug}`)
  results.titles[slug] = { h1, title, same: plain(title) === plain(h1) }
  const links = await page.locator('main a[href^="/guides/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')))
  for (const href of new Set(links)) {
    const target = href.replace('/guides/', '').split('#')[0]
    if (target && target !== slug) (results.incoming[target] ??= []).push(slug)
  }
}
const same = Object.entries(results.titles).filter(([, t]) => t.same).map(([s]) => s)
if (after) assert.deepEqual(same, [])
else assert.ok(same.includes('cover-me-vs-jobscan') && same.includes('cover-me-vs-teal'))

const flagged = after ? ['aiapply-review', 'free-jobscan-alternatives', 'use-your-own-api-key-for-cover-letters'] : ['cover-me-vs-aiapply', 'free-jobscan-alternatives', 'use-your-own-api-key-for-cover-letters']
results.flaggedIncoming = Object.fromEntries(flagged.map((s) => [s, results.incoming[s] ?? []]))
if (after) for (const s of flagged) assert.ok(results.flaggedIncoming[s].length >= 2, s)
else for (const s of flagged) assert.ok(results.flaggedIncoming[s].length < 2, s)

if (after) {
  await read('/guides/teal-review')
  await page.locator('#is-teal-a-job-site').scrollIntoViewIfNeeded()
  await page.locator('#is-teal-a-job-site').evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 80))
  await page.screenshot({ path: `${out}${label}-5-teal-job-site.png` })
  await read('/guides/aiapply-review')
  await page.locator('#does-aiapply-work').evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 80))
  await page.screenshot({ path: `${out}${label}-6-aiapply-works.png` })
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  const m = await mobile.newPage()
  await m.goto(base + '/guides/teal-review', { waitUntil: 'networkidle' })
  await m.screenshot({ path: `${out}${label}-7-teal-mobile.png` })
  await mobile.close()
}

writeFileSync(`${out}${label}-results.json`, JSON.stringify(results, null, 2))
await browser.close()
console.log(`${label}: all assertions passed`)
