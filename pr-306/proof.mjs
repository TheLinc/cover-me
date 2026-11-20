// Usage: node proof.mjs <before|after> <base url> <out dir>
import { createRequire } from 'node:module'
const require = createRequire('F:/personal-projects/cover-me/extension/package.json')
const { chromium } = require('playwright')
const [label, base, out] = process.argv.slice(2)
const expect = label === 'after' ? 'ATS resume checker' : 'ATS keyword checker'
const browser = await chromium.launch()
for (const [w, h, tag] of [[1280, 900, 'desktop'], [390, 844, 'mobile']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  await page.goto(`${base}/guides/what-is-an-ats-score`, { waitUntil: 'networkidle' })
  const link = page.locator('main a[href="/ats-checker"]').first()
  if ((await link.innerText()) !== expect) throw new Error(`${label}: guide link reads "${await link.innerText()}"`)
  if (tag === 'desktop') {
    await link.scrollIntoViewIfNeeded()
    await link.evaluate((a) => (a.style.outline = '2px solid #e11d48'))
    await link.locator('xpath=ancestor::li[1]').screenshot({ path: `${out}/${label}-1-guide-link.png` })
  }
  await page.addStyleTag({ content: 'header, nav[class*=sticky], nextjs-portal { display: none !important }' })
  const foot = page.locator('footer a[href="/ats-checker"]')
  await foot.evaluate((a) => (a.style.outline = '2px solid #e11d48'))
  await foot.locator('xpath=ancestor::*[self::ul or self::div][1]/..').screenshot({ path: `${out}/${label}-2-footer-${tag}.png` })
  console.log(label, tag, 'footer:', await foot.innerText())
  await page.close()
}
await browser.close()
