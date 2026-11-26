// Proof for #195's policy text. Usage: tsx privacy.ts <before|after> <base url> <out dir>
import { join } from 'node:path'
import { chromium } from 'playwright'

const [label, base, out] = process.argv.slice(2)
const browser = await chromium.launch({ channel: 'chromium' })
const lines = [
  'Requests to hear back about a site (Hosted mode, signed in, only if you tick the box).',
  'To email you once when Cover Me starts reading a job site you asked to hear about',
  'the sites you asked to hear back about with your account ID',
  'the one email saying Cover Me now reads a site you asked to hear back about',
  'Deleted when we send the email, when you untick the box, or after 12 months',
]
for (const [name, width] of [['desktop', 1280], ['mobile', 390]] as const) {
  const page = await browser.newPage({ viewport: { width, height: 900 } })
  await page.goto(`${base}/privacy`, { waitUntil: 'networkidle' })
  const text = await page.locator('main').innerText()
  for (const l of lines) {
    const has = text.replace(/\s+/g, ' ').includes(l)
    console.log(`${has === (label === 'after') ? 'PASS' : 'FAIL'} ${label} ${name}: ${has ? 'has' : 'lacks'} "${l}"`)
    if (has !== (label === 'after')) process.exitCode = 1
  }
  const first = page.locator('li', { hasText: label === 'after' ? 'Requests to hear back about a site' : 'Facts you add.' }).first()
  await first.scrollIntoViewIfNeeded()
  const docY = async (l: typeof first) => (await l.boundingBox())!.y + await page.evaluate(() => window.scrollY)
  const clipTop = (await docY(first)) - 40
  await page.screenshot({ path: join(out, `${label}-privacy-collect-${name}.png`), fullPage: true, clip: { x: 0, y: clipTop, width, height: label === 'after' ? (width < 500 ? 640 : 380) : (width < 500 ? 420 : 260) } })
  const ret = page.locator('li', { hasText: 'Rate-limit counters:' }).first()
  await ret.scrollIntoViewIfNeeded()
  const retTop = (await docY(ret)) - (label === 'after' ? (width < 500 ? 160 : 100) : 40)
  await page.screenshot({ path: join(out, `${label}-privacy-retention-${name}.png`), fullPage: true, clip: { x: 0, y: retTop, width, height: width < 500 ? 320 : 200 } })
  await page.close()
}
await browser.close()
