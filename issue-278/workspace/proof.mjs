// Usage: node proof.mjs before|after  (Cover Me PR #289, free ATS checker layout)
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
const require = createRequire('F:/worktrees/cover-me/t3-2f6a38e1/extension/package.json')
const { chromium } = require('playwright')
const mode = process.argv[2]
const PDF = 'F:/worktrees/cover-me/t3-2f6a38e1/web/public/guides/ats-friendly-resume-format/files/single-column.pdf'
const posting = readFileSync(new URL('./posting.txt', import.meta.url), 'utf8')
const out = new URL('./', import.meta.url).pathname.slice(1)
const fail = (m) => { console.error(`FAIL ${mode}: ${m}`); process.exitCode = 1 }
const b = await chromium.launch()
for (const [name, vp] of [['desktop', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const p = await b.newPage({ viewport: vp })
  const leaks = []
  p.on('request', (r) => { if (/Northwind|Rivera|demand generation/i.test(r.url() + (r.postData() ?? ''))) leaks.push(r.url()) })
  await p.goto('http://localhost:3456/ats-checker', { waitUntil: 'networkidle' })
  await p.screenshot({ path: `${out}${mode}-${name}-1-first-screen.png` })
  const sample = await p.getByText('Sample', { exact: true }).count()
  if (mode === 'after' && !sample) fail(`${name}: no sample result before input`)
  if (mode === 'before' && sample) fail(`${name}: sample shown on before`)
  await p.fill('#posting', posting)
  if (mode === 'after' && name === 'phone') await p.getByRole('tab', { name: /Resume/ }).click()
  await p.setInputFiles('input[type=file]', PDF)
  await p.waitForFunction(() => /found|of \d+/.test(document.querySelector('#results')?.textContent ?? ''), null, { timeout: 30000 })
  await p.waitForTimeout(800)
  await p.evaluate(() => window.scrollTo(0, 0))
  await p.waitForTimeout(300)
  await p.screenshot({ path: `${out}${mode}-${name}-2-after-check.png` })
  const heading = await p.locator('#results').evaluate((e) => ({ text: e.textContent, top: e.getBoundingClientRect().top }))
  const install = p.locator(name === 'phone' ? 'button:has-text("Send this to my computer")' : 'a:has-text("Tailor this resume in Chrome, free")').first()
  const installTop = (await install.count()) ? await install.evaluate((e) => e.getBoundingClientRect().top) : null
  console.log(mode, name, JSON.stringify(heading), 'install top', installTop, 'leaks', leaks.length)
  if (mode === 'after') {
    if (!/^Must-haves on your resume: \d+ of \d+$/.test(heading.text)) fail(`${name}: headline ${heading.text}`)
    if (heading.top > vp.height) fail(`${name}: result below the first screen`)
    if (installTop === null || installTop > vp.height) fail(`${name}: install not on the first screen`)
    if (name === 'desktop') {
      await p.locator('button:has-text("content marketing")').first().click()
      await p.waitForTimeout(700)
      await p.screenshot({ path: `${out}${mode}-${name}-3-missing-keyword.png` })
      await p.keyboard.press('Escape')
      await p.locator('button:has-text("Google Analytics")').first().click()
      await p.waitForTimeout(700)
      await p.screenshot({ path: `${out}${mode}-${name}-4-found-keyword.png` })
    }
  } else {
    const chipTop = await p.locator('section[aria-labelledby=results] li').first().evaluate((e) => e.getBoundingClientRect().top)
    console.log(mode, name, 'first keyword top', chipTop)
    if (chipTop < vp.height) fail(`${name}: expected the old keywords below the first screen`)
  }
  if (leaks.length) fail(`${name}: posting or resume text in a request: ${leaks.join(', ')}`)
  await p.close()
}
await b.close()
console.log(process.exitCode ? 'FAILED' : `PASS ${mode}`)
