// Proof for #310: node proof-310.mjs <before|after> <baseUrl> <outDir>
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'

const require = createRequire(process.env.PLAYWRIGHT_FROM ?? import.meta.url)
const { chromium } = require('playwright')

const [which, base, out] = process.argv.slice(2)
const after = which === 'after'
const slug = 'how-to-answer-job-application-questions'
const url = `${base}/guides/${slug}`

const text = async (path) => (await fetch(base + path)).text()

const page404 = await fetch(url)
const sitemap = await text('/sitemap.xml')
const llms = await text('/llms.txt')
console.log(`${which}: GET /guides/${slug} -> ${page404.status}`)
console.log(`${which}: sitemap lists guide: ${sitemap.includes(`/guides/${slug}<`)}`)
console.log(`${which}: llms.txt lists guide: ${llms.includes(`/guides/${slug})`)}`)
assert.equal(page404.status, after ? 200 : 404)
assert.equal(sitemap.includes(`/guides/${slug}<`), after)
assert.equal(llms.includes(`/guides/${slug})`), after)

const browser = await chromium.launch()
for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport })
  const p = await ctx.newPage()

  await p.goto(`${base}/guides`, { waitUntil: 'networkidle' })
  const card = p.locator(`a[href="/guides/${slug}"]`).first()
  assert.equal(await card.count(), after ? 1 : 0)
  if (after) await card.scrollIntoViewIfNeeded()
  await p.screenshot({ path: `${out}/${which}-1-guides-index-${label}.png` })

  await p.goto(url, { waitUntil: 'networkidle' })
  await p.screenshot({ path: `${out}/${which}-2-guide-top-${label}.png` })
  if (after) {
    const faq = await p.evaluate(() =>
      [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent)).find((j) => j['@type'] === 'FAQPage'),
    )
    const names = faq.mainEntity.map((q) => q.name)
    console.log(`${which} ${label}: FAQPage entries:\n  ${names.join('\n  ')}`)
    assert.equal(names.length, 5)
    const types = await p.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent)['@type']))
    assert.ok(types.includes('Article'))
    const body = await p.locator('main').innerText()
    assert.doesNotMatch(body, /autofill|auto-apply/i)

    await p.locator('h2#why-are-you-interested-in-this-position').scrollIntoViewIfNeeded()
    await p.evaluate(() => window.scrollBy(0, -80))
    await p.screenshot({ path: `${out}/${which}-3-first-question-${label}.png` })

    await p.locator('h2#write-a-first-draft-in-the-box').scrollIntoViewIfNeeded()
    await p.evaluate(() => window.scrollBy(0, -80))
    await p.screenshot({ path: `${out}/${which}-4-draft-section-${label}.png` })

    const install = p.locator('main a', { hasText: 'Install free · Chrome' })
    const href = await install.getAttribute('href')
    console.log(`${which} ${label}: install button -> ${href}`)
    assert.match(href, /chromewebstore\.google\.com/)
    await p.locator('a[href="#get-cover-me"]').click()
    await p.waitForTimeout(600)
    await p.screenshot({ path: `${out}/${which}-5-install-${label}.png` })
  }
  await ctx.close()
}
await browser.close()
console.log(`${which}: all checks passed`)
