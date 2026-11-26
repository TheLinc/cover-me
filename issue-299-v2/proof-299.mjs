// Usage: node proof-299.mjs <before|after> <base url> <out dir>
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire('F:/personal-projects/cover-me/extension/package.json')
const { chromium } = require('playwright')

const [mode, base, out] = process.argv.slice(2)
const after = mode === 'after'
const published = ['sales', 'marketing', 'engineering']
const held = ['administrative-assistant', 'warehouse']

const sitemap = await (await fetch(`${base}/sitemap.xml`)).text()
const llms = await (await fetch(`${base}/llms.txt`)).text()
for (const path of ['/resume-keywords', ...published.map((r) => `/resume-keywords/${r}`)]) {
  assert.equal(sitemap.includes(`${path}</loc>`), after, `sitemap ${path}`)
  assert.equal(llms.includes(`(https://www.cover-me.dev${path})`), after, `llms.txt ${path}`)
}
for (const r of held) {
  assert.equal(sitemap.includes(`/resume-keywords/${r}</loc>`), false, `held ${r} not in sitemap`)
  assert.equal((await fetch(`${base}/resume-keywords/${r}`)).status, 404, `held ${r} is 404`)
}

const browser = await chromium.launch()
for (const [width, tag] of [[1280, 'desktop'], [390, 'phone']]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } })
  for (const [step, path] of [['1-sales', 'resume-keywords/sales'], ['2-engineering', 'resume-keywords/engineering'], ['3-index', 'resume-keywords']]) {
    const res = await page.goto(`${base}/${path}`, { waitUntil: 'networkidle' })
    assert.equal(res.status(), after ? 200 : 404, `${path} status`)
    if (after && step !== '3-index') {
      const main = await page.locator('main').innerText()
      assert.match(main, /ask most for \w[^.]* \(\d+%\)/, 'lead sentence with shares')
      for (const kind of ['Tools and software', 'Skills', 'Education and certifications', 'Soft skills']) await page.getByRole('heading', { level: 3, name: kind, exact: true }).waitFor()
      assert.match(await page.locator('tbody tr').first().innerText(), /\d+%\s+\d+ of \d+/, 'share and count columns')
      await page.getByRole('heading', { level: 2, name: 'Where to put these keywords' }).waitFor()
      assert.ok(await page.getByRole('heading', { level: 2, name: /\?$/ }).count() >= 2, 'question headings')
      assert.match(main, /mostly to tech companies/)
      assert.equal(await page.locator('main a[href="/guides/tailor-resume-to-job-description"]').count() >= 1, true)
      assert.equal(await page.locator('main a[href="/ats-checker"]').count() >= 1, true)
    }
    if (after && step === '3-index') assert.equal(await page.locator('main a[href^="/resume-keywords/"]').count(), published.length)
    if (tag === 'desktop' || step === '1-sales') await page.screenshot({ path: `${out}/${mode}-${step}-${tag}.png`, fullPage: true })
  }
  if (tag === 'desktop') {
    await page.goto(`${base}/ats-checker`, { waitUntil: 'networkidle' })
    assert.equal(await page.locator('a[href="/resume-keywords"]').count() >= 1, after, 'ATS checker links to /resume-keywords')
  }
  await page.close()
}
await browser.close()
console.log(`${mode}: all assertions passed`)
