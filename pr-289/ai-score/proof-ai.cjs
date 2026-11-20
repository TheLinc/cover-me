// Proof for PR #289: node proof-ai.cjs <before|after> <base url> <out dir>
// before (master): /ats-checker is a 404.
// after (this branch): the sample and a made-up pair get an ATS match score, an unmet years
// requirement, the job title (not the employer's name), and only ats-check carries the text.
const { chromium } = require('F:/worktrees/cover-me/t3-2f6a38e1/extension/node_modules/playwright')
const assert = require('node:assert')
const fs = require('node:fs')
const [mode, base, out] = process.argv.slice(2)
const D = 'F:/scratch/ats-dev/'
fs.mkdirSync(out, { recursive: true })

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const res = await page.goto(`${base}/ats-checker`, { waitUntil: 'load', timeout: 180000 })
  if (mode === 'before') {
    assert.equal(res.status(), 404)
    await page.screenshot({ path: `${out}/before-1-ats-checker.png` })
    console.log('before: /ats-checker is a 404')
    return browser.close()
  }

  assert.equal(res.status(), 200)
  await page.waitForSelector('text=ATS match: 93 out of 100')
  assert.ok(await page.getByText("The check sends the posting and your resume to Anthropic's AI").isVisible())
  await page.screenshot({ path: `${out}/after-1-sample.png` })

  const posting = fs.readFileSync(`${D}09-supply-planner-posting.txt`, 'utf8')
  const resume = fs.readFileSync(`${D}09-supply-planner-resume.txt`, 'utf8')
  const carriers = []
  page.on('request', (r) => { if ((r.postData() ?? '').includes('Buckeye Fresh Markets') || r.url().includes('Buckeye')) carriers.push(r.url()) })
  await page.fill('#posting', posting)
  await page.fill('#resume', resume)
  const t0 = Date.now()
  await page.waitForSelector('text=Checking your resume against the posting')
  await page.waitForSelector('h2#results:has-text("ATS match")', { timeout: 90000 })
  console.log(`result after ${((Date.now() - t0) / 1000).toFixed(1)}s:`, await page.locator('#results').textContent())
  assert.equal(await page.locator('section[aria-labelledby="results"]').getByText('quick word match').count(), 0)
  const unmet = page.locator('text=Requirements your resume doesn\'t meet').locator('xpath=..')
  console.log('unmet:', await unmet.textContent())
  assert.match(await unmet.textContent(), /Requires 4yr.*candidate ~3(\.5)?yr/)
  assert.ok(await page.getByText('Posting:', { exact: true }).locator('xpath=..').getByText('Supply Planner').isVisible())
  assert.deepEqual([...new Set(carriers)], ['http://127.0.0.1:54321/functions/v1/ats-check'])
  await page.screenshot({ path: `${out}/after-2-result.png` })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: `${out}/after-3-phone.png` })

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.getByRole('button', { name: 'Edit the resume' }).click()
  await page.fill('#resume', `${resume}\n${'Extra line of resume text. '.repeat(1200)}`)
  await page.getByRole('button', { name: 'Check again' }).click()
  await page.waitForSelector('text=over 30,000 characters')
  await page.screenshot({ path: `${out}/after-4-too-long.png` })
  console.log('after: all assertions passed')
  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
