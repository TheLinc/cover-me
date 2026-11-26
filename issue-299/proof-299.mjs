// Usage: node proof-299.mjs <before|after> <base url> <out dir>
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire('F:/personal-projects/cover-me/extension/package.json')
const { chromium } = require('playwright')

const [mode, base, out] = process.argv.slice(2)
const after = mode === 'after'
const roles = ['sales', 'marketing', 'engineering', 'warehouse', 'administrative-assistant']

const sitemap = await (await fetch(`${base}/sitemap.xml`)).text()
const llms = await (await fetch(`${base}/llms.txt`)).text()
for (const path of ['/resume-keywords', ...roles.map((r) => `/resume-keywords/${r}`)]) {
  assert.equal(sitemap.includes(`${path}</loc>`), after, `sitemap ${path}`)
  assert.equal(llms.includes(`(https://www.cover-me.dev${path})`), after, `llms.txt ${path}`)
}

const browser = await chromium.launch()
for (const [width, tag] of [[1280, 'desktop'], [390, 'phone']]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } })
  for (const [step, path] of [['1-role-page', 'resume-keywords/sales'], ['2-index', 'resume-keywords']]) {
    const res = await page.goto(`${base}/${path}`, { waitUntil: 'networkidle' })
    assert.equal(res.status(), after ? 200 : 404, `${path} status`)
    if (after && step === '1-role-page') {
      await page.getByRole('heading', { level: 1, name: 'Sales resume keywords' }).waitFor()
      const rows = await page.locator('tbody tr').count()
      assert.ok(rows > 0, 'keyword rows')
      const first = await page.locator('tbody tr').first().innerText()
      assert.match(first, /\d+ of \d+/, 'count as N of M')
      assert.match(await page.locator('main').innerText(), /\d+ sales postings from \d+ companies, read on \w+ \d+, \d{4} from their public job boards on Greenhouse \(\d+\) and Lever \(\d+\)/)
      assert.equal(await page.locator('main a[href="/ats-checker"]').count() >= 1, true, 'links to the ATS checker')
    }
    if (after && step === '2-index') assert.equal(await page.locator('main a[href^="/resume-keywords/"]').count(), roles.length)
    await page.screenshot({ path: `${out}/${mode}-${step}-${tag}.png`, fullPage: true })
  }
  await page.close()
}
await browser.close()
console.log(`${mode}: all assertions passed`)
