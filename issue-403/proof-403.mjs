// Proof for #403: the landing page quotes the popup's renamed option.
// usage: node proof-403.mjs <label: before|after> <base url> <out dir>
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'

const require = createRequire(process.env.PLAYWRIGHT_FROM ?? import.meta.url)
const { chromium } = require('playwright')

const [label, base, out] = process.argv.slice(2)
const OLD = /Remove irrelevant bullets/
const NEW = /Cut what doesn[’']t fit this job/

const browser = await chromium.launch()
for (const [size, viewport] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport })
  await page.goto(base + '/', { waitUntil: 'networkidle' })

  const section = page.locator('#how-it-works')
  const top = await section.evaluate((el) => el.getBoundingClientRect().top + window.scrollY)
  await page.evaluate((y) => window.scrollTo(0, y), top + 3.5 * 0.9 * viewport.height)
  await page.waitForTimeout(800)
  const chapter = page.getByText(/^Same jobs, same facts/).filter({ visible: true }).first()
  const chapterText = await chapter.innerText()
  await page.screenshot({ path: `${out}/${label}-1-how-it-works-${size}.png` })

  const faq = page.locator('details', { hasText: 'Should I give Cover Me a long master resume?' })
  await faq.locator('summary').click()
  await faq.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  const faqText = await faq.locator('p').innerText()
  await faq.screenshot({ path: `${out}/${label}-2-faq-${size}.png` })

  if (label === 'after') {
    assert.match(chapterText, NEW); assert.doesNotMatch(chapterText, OLD)
    assert.match(chapterText, /bullets and skills/)
    assert.match(faqText, NEW); assert.doesNotMatch(faqText, OLD)
    assert.match(faqText, /bullets and skills that fit each job/)
  } else {
    assert.match(chapterText, OLD); assert.match(faqText, OLD)
  }
  console.log(label, size, '| chapter:', chapterText, '| faq:', faqText.slice(faqText.indexOf('turn on')))
  await page.close()
}
await browser.close()
