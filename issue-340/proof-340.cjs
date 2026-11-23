// Usage: node proof-340.cjs <outDir>. Before = master on :3281, after = this branch on :3282.
const { chromium } = require('F:/personal-projects/cover-me/extension/node_modules/playwright')
const assert = require('node:assert/strict')
const path = require('node:path')

const OUT = process.argv[2]
const RUNS = [['before', 'http://localhost:3281/'], ['after', 'http://localhost:3282/']]
const SIZES = [
  ['1440', { viewport: { width: 1440, height: 900 } }],
  ['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
]

;(async () => {
  const browser = await chromium.launch()
  for (const [name, url] of RUNS) {
    for (const [w, opts] of SIZES) {
      const ctx = await browser.newContext({ ...opts, reducedMotion: 'reduce' })
      const page = await ctx.newPage()
      await page.goto(url, { waitUntil: 'networkidle', timeout: 180_000 })
      const hero = page.locator('main section').first()
      const line = hero.locator('.font-mono').first()
      const text = await line.innerText()
      if (name === 'before') {
        assert.match(text, /no API key needed/)
        assert.match(text, /Open source/)
        assert.match(text, /Chrome Web Store/)
      } else {
        assert.match(text, /Free, no credit card/)
        assert.match(text, /10 resumes or letters, then 5 a week/)
        assert.match(text, /Never invents experience/)
        assert.doesNotMatch(text, /API key|Open source|Chrome Web Store/)
      }
      await hero.screenshot({ path: path.join(OUT, `${name}-1-hero-${w}.png`) })

      const band = page.locator('section', { has: page.getByRole('heading', { name: 'Your resume stays yours' }) })
      await band.scrollIntoViewIfNeeded()
      await page.waitForTimeout(700)
      await band.screenshot({ path: path.join(OUT, `${name}-2-privacy-own-key-${w}.png`) })
      await band.getByRole('radio').nth(1).click()
      await page.waitForTimeout(900)
      await band.screenshot({ path: path.join(OUT, `${name}-3-privacy-account-${w}.png`) })

      const body = await page.locator('main').innerText()
      if (name === 'before') {
        assert.match(body, /AES-256-GCM/)
      } else {
        assert.doesNotMatch(body, /AES-256-GCM/)
        assert.match(await band.innerText(), /FOR DEVELOPERS|For developers/)
        assert.match(await band.innerText(), /Bring your own Claude or OpenAI API key/)
        assert.match(await band.innerText(), /open source under the MIT license/)
      }
      console.log(`${name} ${w}: ok`)
      await ctx.close()
    }
  }
  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
