// Usage: node proof.cjs <before|after> <base url> <out dir>
// Same steps on both versions; asserts the old result on "before" and the new one on "after".
const { chromium } = require('F:/worktrees/cover-me/t3-2f6a38e1/extension/node_modules/playwright')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')

const [version, BASE, OUT] = process.argv.slice(2)
const after = version === 'after'
fs.mkdirSync(OUT, { recursive: true })
const shot = (n, step) => path.join(OUT, `${version}-${n}-${step}.png`)
const POSTING = fs.readFileSync(path.join(__dirname, 'posting.txt'), 'utf8')
const RESUME = 'F:/worktrees/cover-me/t3-2f6a38e1/web/public/guides/ats-friendly-resume-format/files/single-column'
const NEW_NAV = ['How it works', 'Application questions', 'ATS checker', 'Pricing']
const OLD_NAV = ['How it works', 'ATS score', 'Pricing', 'Guides', 'Roadmap', 'About']

;(async () => {
  const browser = await chromium.launch()

  const desk = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await desk.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  const nav = await desk.$$eval('header nav[aria-label="Main"] a', (as) => as.map((a) => a.textContent.trim()))
  assert.deepStrictEqual(nav, after ? NEW_NAV : OLD_NAV)
  await desk.screenshot({ path: shot(1, 'header-1440'), clip: { x: 0, y: 0, width: 1440, height: 72 } })

  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await phone.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await phone.click('button[aria-label="Open menu"]')
  await phone.waitForSelector('[role=dialog] nav a')
  await phone.waitForTimeout(500)
  const sheet = await phone.$$eval('[role=dialog] nav a', (as) => as.map((a) => a.textContent.trim()))
  assert.deepStrictEqual(sheet, [...(after ? NEW_NAV : OLD_NAV), 'Sign in'])
  await phone.screenshot({ path: shot(2, 'phone-menu') })

  const footer = await desk.$$eval('footer a', (as) => as.map((a) => a.textContent.trim()))
  for (const label of ['All guides', 'About', 'Roadmap']) assert.ok(footer.includes(label), `footer keeps ${label}`)
  assert.strictEqual(footer.includes('ATS checker'), after)

  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...(after ? { recordVideo: { dir: OUT, size: { width: 1440, height: 1000 } } } : {}) })
  const page = await context.newPage()
  const requests = []
  page.on('request', (r) => requests.push(`${r.method()} ${r.url()} ${r.postData() ?? ''}`))
  const res = await page.goto(`${BASE}/ats-checker`, { waitUntil: 'networkidle' })
  if (!after) {
    assert.strictEqual(res.status(), 404)
    await page.screenshot({ path: shot(3, 'ats-checker') })
  } else {
    assert.strictEqual(res.status(), 200)
    await page.fill('#posting', POSTING)
    for (const [n, ext] of [[3, 'pdf'], [4, 'docx']]) {
      await page.setInputFiles('input[type=file]', `${RESUME}.${ext}`)
      await page.waitForFunction((name) => document.querySelector('[role=status]')?.textContent?.startsWith(`Read ${name}`), `single-column.${ext}`)
      assert.strictEqual((await page.textContent('#results')).trim(), '11 of 16 keywords found')
      await page.waitForTimeout(300)
      await page.screenshot({ path: shot(n, `ats-checker-${ext}`), fullPage: n === 3 })
    }
    const leaks = requests.filter((r) => /Northwind|Fernwood|Rivera|HubSpot/.test(r))
    assert.deepStrictEqual(leaks, [], 'no request carries posting or resume text')
    assert.ok(requests.every((r) => r.startsWith('GET ')), 'only GET requests')
    console.log(`requests while checking: ${requests.length}, all GET, none with posting or resume text`)
  }
  await context.close()

  const guide = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await guide.goto(`${BASE}/guides/what-is-an-ats-score`, { waitUntil: 'networkidle' })
  assert.strictEqual(await guide.$$eval('main a[href="/ats-checker"]', (as) => as.length > 0), after)

  await browser.close()
  console.log(`${version}: all assertions passed`)
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
