// Usage: node links-proof.mjs <before|after> <baseUrl> <outDir>
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import assert from 'node:assert/strict'

const require = createRequire(process.env.PLAYWRIGHT_FROM ?? import.meta.url)
const { chromium } = require('playwright')
const [label, base, out] = process.argv.slice(2)
mkdirSync(out, { recursive: true })

const PAGES = [
  { slug: 'tailor-guide', path: '/guides/tailor-resume-to-job-description', block: 'p:has-text("which is why I built")', targets: ['/guides/chatgpt-resume-prompts', '/guides/chatgpt-cover-letter-prompts'] },
  { slug: 'ats-score-guide', path: '/guides/what-is-an-ats-score', block: 'p:has-text("covers each step in detail")', targets: ['/guides/chatgpt-resume-prompts'] },
  { slug: 'ats-checker', path: '/ats-checker', block: 'div:has(> h2:has-text("How the checker scores a resume"))', targets: ['/guides/chatgpt-resume-prompts'] },
]
const VIEWPORTS = [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]

for (let i = 0; i < 60; i++) {
  const ok = await fetch(base + PAGES[0].path).then((r) => r.ok, () => false)
  if (ok) break
  await new Promise((r) => setTimeout(r, 3000))
}

const browser = await chromium.launch()
for (const [vpName, viewport] of VIEWPORTS) {
  const page = await browser.newPage({ viewport })
  for (const [n, p] of PAGES.entries()) {
    await page.goto(base + p.path, { waitUntil: 'networkidle', timeout: 180000 })
    for (const t of p.targets) {
      const inMain = await page.locator(`main a[href="${t}"]`).count()
      if (label === 'after') assert.ok(inMain > 0, `${p.path} should link ${t} in the page body`)
      else assert.equal(inMain, 0, `${p.path} already links ${t} on the base branch`)
    }
    const block = page.locator(p.block).last()
    await block.scrollIntoViewIfNeeded()
    await block.evaluate((el) => el.querySelectorAll('a[href^="/guides/chatgpt-"]').forEach((a) => { a.style.outline = '2px solid #e11d48'; a.style.outlineOffset = '2px' }))
    await block.screenshot({ path: `${out}/${label}-${n + 1}-${p.slug}-${vpName}.png` })
  }
  await page.close()
}
await browser.close()
console.log(`${label}: assertions passed`)
