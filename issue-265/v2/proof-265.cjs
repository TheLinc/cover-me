// node proof-265.cjs <base url> <before|after> <out dir>
// Asserts the /for/linkedin copy, dates and structured data, and screenshots the top and the FAQ.
const assert = require('node:assert/strict')
const path = require('node:path')
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright')

const [base, mode, out] = process.argv.slice(2)
const FAQ = 'Can you add a cover letter on LinkedIn?'
const HELP = 'https://www.linkedin.com/help/linkedin/answer/a512388'

;(async () => {
  const browser = await chromium.launch()
  for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport, colorScheme: 'light' })
    await page.goto(`${base}/for/linkedin`, { waitUntil: 'networkidle' })
    const title = await page.title()
    const desc = await page.getAttribute('meta[name="description"]', 'content')
    const h1 = (await page.locator('h1').innerText()).trim()
    const answer = (await page.locator('h1 + p').innerText()).trim()
    const time = await page.locator('main time').first().getAttribute('datetime').catch(() => null)
    const jsonLd = await page.$$eval('script[type="application/ld+json"]', (s) => s.map((x) => JSON.parse(x.textContent)))
    const faqNames = jsonLd.find((j) => j['@type'] === 'FAQPage').mainEntity.map((q) => q.name)
    const webPage = jsonLd.find((j) => j['@type'] === 'WebPage' && j.url?.endsWith('/for/linkedin'))
    const help = page.locator(`a[href="${HELP}"]`)
    const faqHeading = page.locator('h2', { hasText: /questions/i }).first()
    const facts = { title, titleLength: title.length, desc, h1, answerWords: answer.split(/\s+/).length, time, dateModified: webPage?.dateModified, faqNames, faqHeading: await faqHeading.innerText(), helpLinks: await help.count() }
    if (label === 'desktop') console.log(mode, JSON.stringify(facts, null, 1))

    if (mode === 'after') {
      assert.equal(title, 'LinkedIn Cover Letter: When and How to Add One | Cover Me')
      assert.ok(title.length <= 60)
      assert.ok(desc.startsWith('You can add a cover letter on LinkedIn only when the employer asks for one'), desc)
      assert.equal(h1, 'How to add a cover letter on LinkedIn')
      assert.ok(answer.startsWith('You can add a cover letter on LinkedIn only when the employer asks for one.'), answer)
      assert.ok(facts.answerWords < 60, `${facts.answerWords} words`)
      assert.equal(time, '2026-11-24')
      await assert.doesNotReject(page.getByText('Updated November 24, 2026').first().waitFor({ state: 'visible' }))
      assert.equal(webPage?.dateModified, '2026-11-24')
      assert.equal(await help.getAttribute('target'), '_blank')
      assert.equal(faqNames[0], FAQ)
      assert.equal(facts.faqHeading, 'Common questions about LinkedIn applications')
      await assert.doesNotReject(page.getByText(FAQ, { exact: true }).first().waitFor({ state: 'visible' }))
    } else {
      assert.equal(title, 'AI Cover Letter and Resume Tailor for LinkedIn | Cover Me')
      assert.equal(h1, 'AI cover letters and tailored resumes for LinkedIn jobs')
      assert.ok(answer.startsWith('To tailor a cover letter and resume to a LinkedIn job'), answer)
      assert.equal(time, null)
      assert.equal(webPage, undefined)
      assert.equal(facts.helpLinks, 0)
      assert.ok(!faqNames.includes(FAQ))
    }

    await page.screenshot({ path: path.join(out, `${mode}-1-top-${label}.png`) })
    if (label === 'desktop') {
      await faqHeading.scrollIntoViewIfNeeded()
      await page.evaluate(() => window.scrollBy(0, -40))
      await page.waitForTimeout(300)
      await page.screenshot({ path: path.join(out, `${mode}-2-faq-${label}.png`) })
    }
    await page.close()
  }
  await browser.close()
  console.log(mode, 'assertions passed')
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
