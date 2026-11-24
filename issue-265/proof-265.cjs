// node proof-265.cjs <base url> <before|after> <out dir>
// Asserts the /for/linkedin copy and FAQPage JSON-LD, and screenshots the top and the FAQ.
const assert = require('node:assert/strict')
const path = require('node:path')
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright')

const [base, mode, out] = process.argv.slice(2)
const NEW = {
  title: 'LinkedIn Cover Letter: How to Add One, and an AI Writer | Cover Me',
  h1: 'How to add a cover letter on LinkedIn',
  answerStart: 'You can add a cover letter on LinkedIn only when the employer asks for one.',
  descStart: 'You can add a cover letter on LinkedIn only when the employer asks for one',
  faq: 'Can you add a cover letter on LinkedIn?',
}
const OLD = {
  title: 'AI Cover Letter and Resume Tailor for LinkedIn | Cover Me',
  h1: 'AI cover letters and tailored resumes for LinkedIn jobs',
  answerStart: 'To tailor a cover letter and resume to a LinkedIn job',
}

;(async () => {
  const browser = await chromium.launch()
  for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport, colorScheme: 'light' })
    await page.goto(`${base}/for/linkedin`, { waitUntil: 'networkidle' })
    const title = await page.title()
    const desc = await page.getAttribute('meta[name="description"]', 'content')
    const h1 = (await page.locator('h1').innerText()).trim()
    const answer = (await page.locator('h1 + p').innerText()).trim()
    const faqLd = (await page.$$eval('script[type="application/ld+json"]', (s) => s.map((x) => JSON.parse(x.textContent)))).find((j) => j['@type'] === 'FAQPage')
    const faqNames = faqLd.mainEntity.map((q) => q.name)
    const facts = { title, desc, h1, answer: answer.slice(0, 120), faqNames }
    if (label === 'desktop') console.log(mode, JSON.stringify(facts, null, 1))

    if (mode === 'after') {
      assert.equal(title, NEW.title)
      assert.ok(desc.startsWith(NEW.descStart), desc)
      assert.equal(h1, NEW.h1)
      assert.ok(answer.startsWith(NEW.answerStart), answer)
      assert.equal(faqNames[0], NEW.faq)
      assert.match(faqLd.mainEntity[0].acceptedAnswer.text, /^Sometimes\. It depends on the employer\./)
      await assert.doesNotReject(page.getByText(NEW.faq, { exact: true }).first().waitFor({ state: 'visible' }))
    } else {
      assert.equal(title, OLD.title)
      assert.equal(h1, OLD.h1)
      assert.ok(answer.startsWith(OLD.answerStart), answer)
      assert.ok(!faqNames.includes(NEW.faq))
    }

    await page.screenshot({ path: path.join(out, `${mode}-1-top-${label}.png`) })
    if (label === 'desktop') {
      const faqHeading = page.locator('h2', { hasText: /question/i }).first()
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
