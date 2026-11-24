// #351 proof. Usage: node proof.mjs <before|after> <baseUrl> <outDir>
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
const require = createRequire('F:/scratch/ats-test/package.json')
const { chromium } = require('playwright')

const [label, base, out] = process.argv.slice(2)
const after = label === 'after'
const GUIDE = '/guides/ats-resume-template'
const DOCX = '/guides/ats-resume-template/ats-resume-template.docx'
const log = []
const note = (s) => { log.push(s); console.log(s) }

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true })
const page = await ctx.newPage()

// 1. The ATS format guide links to the template next to its test files.
await page.goto(`${base}/guides/ats-friendly-resume-format`, { waitUntil: 'networkidle' })
const inbound = page.locator(`main a[href="${GUIDE}"]`)
assert.equal(await inbound.count(), after ? 1 : 0, 'format guide link to the template')
const caption = page.getByText('Tested October 31, 2026. Click a layout')
await caption.scrollIntoViewIfNeeded()
await page.evaluate(() => window.scrollBy(0, -420))
await page.screenshot({ path: `${out}/${label}-1-format-guide-results.png` })

// 2. The template page.
const res = await page.goto(`${base}${GUIDE}`, { waitUntil: 'networkidle' })
assert.equal(res.status(), after ? 200 : 404, 'template page status')
await page.screenshot({ path: `${out}/${label}-2-template-page-top.png` })
note(`${GUIDE}: HTTP ${res.status()}`)

if (after) {
  const title = await page.title()
  note(`title: ${title} (${title.length} chars)`)
  const dl = page.locator(`a[href="${DOCX}"][download]`)
  assert.equal(await dl.count(), 1, 'one download link')
  const firstSection = page.locator('.guide-prose section').first()
  const [dlY, secY] = [await dl.evaluate((e) => e.getBoundingClientRect().top), await firstSection.evaluate((e) => e.getBoundingClientRect().top)]
  assert.ok(dlY < secY, 'download comes before the first section')
  await dl.scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy(0, -200))
  await page.screenshot({ path: `${out}/${label}-3-download-box.png` })

  // 3. Download with a fresh context: no cookies, no sign-in.
  assert.equal((await ctx.cookies()).filter((c) => /auth|sb-/.test(c.name)).length, 0, 'not signed in')
  const [download] = await Promise.all([page.waitForEvent('download'), dl.click()])
  const saved = `${out}/downloaded.docx`
  await download.saveAs(saved)
  const bytes = readFileSync(saved)
  assert.equal(download.suggestedFilename(), 'ats-resume-template.docx')
  assert.equal(bytes.subarray(0, 2).toString(), 'PK', 'a zip (docx) file')
  note(`download: ${download.suggestedFilename()}, ${bytes.length} bytes, starts with PK`)

  // 4. Systems, dates and the write-up link.
  const text = await page.locator('article').innerText()
  for (const s of ['Lever', 'Workday', 'Ashby', 'SmartRecruiters', 'October 31, 2026', 'November 24, 2026']) assert.ok(text.includes(s), s)
  assert.ok((await page.locator('article a[href="/guides/ats-friendly-resume-format"]').count()) >= 1, 'link to the write-up')
  await page.locator('#which-atss-read-it-correctly').scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy(0, -90))
  await page.screenshot({ path: `${out}/${label}-4-which-atss.png` })

  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  await phone.goto(`${base}${GUIDE}`, { waitUntil: 'networkidle' })
  await phone.locator(`a[href="${DOCX}"]`).scrollIntoViewIfNeeded()
  await phone.evaluate(() => window.scrollBy(0, -250))
  await phone.screenshot({ path: `${out}/${label}-5-phone-download.png` })
  assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= 390), 'no sideways page scroll on a phone')
}

// 5. Sitemap and llms.txt.
const sitemap = await (await ctx.request.get(`${base}/sitemap.xml`)).text()
const llms = await (await ctx.request.get(`${base}/llms.txt`)).text()
const inSitemap = sitemap.includes(`${GUIDE}</loc>`)
const inLlms = llms.includes(`https://www.cover-me.dev${GUIDE})`)
assert.equal(inSitemap, after, 'in sitemap')
assert.equal(inLlms, after, 'in llms.txt')
note(`sitemap.xml has ${GUIDE}: ${inSitemap}`)
note(`llms.txt has ${GUIDE}: ${inLlms}`)
if (after) note('sitemap line: ' + sitemap.split('<url>').find((u) => u.includes(GUIDE)).replace(/\s+/g, ' ').trim())

writeFileSync(`${out}/${label}.txt`, log.join('\n') + '\n')
await browser.close()
console.log(`${label}: all assertions passed`)
