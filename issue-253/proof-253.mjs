// Usage: node proof-253.mjs <extension dist> <before|after> <out dir>
// Seeds a finished tailor result (made-up data) and checks the title tip in
// the popup and the editor. "after" expects the shorter-form tip, "before" none.
import { createRequire } from 'node:module'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const [dist, label, out] = process.argv.slice(2)
const require = createRequire(join(dist, '..', 'package.json'))
const { chromium } = require('playwright')
const profile = mkdtempSync(join(tmpdir(), 'proof-253-'))
const ctx = await chromium.launchPersistentContext(profile, {
  channel: 'chromium', headless: true, viewport: { width: 400, height: 600 },
  args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
})
const fail = (msg) => { console.error(`FAIL (${label}): ${msg}`); process.exitCode = 1 }
const expectTip = label === 'after'
const SHORTER = "Your summary opens with Software Engineer, a shorter form of this posting's title"
try {
  let [sw] = ctx.serviceWorkers()
  sw ??= await ctx.waitForEvent('serviceworker')
  const id = new URL(sw.url()).host
  const job = { title: 'Software Development Engineer', company: 'Acme Robotics', description: 'Build services for warehouse robots.', url: 'https://example.com/jobs/123' }
  const exp = [{ title: 'Full Stack Developer', company: 'Northwind Labs', location: 'Remote', dates: '2022 - now', bullets: ['Built the billing service in TypeScript'] }]
  const tailored = { name: 'Pat Lee', phone: '', email: 'pat@example.com', website: '', summary: 'Software Engineer building full-stack, AI-powered applications.', experience: exp, education: [], skills: 'TypeScript, Postgres' }

  const popup = await ctx.newPage()
  await popup.goto(`chrome-extension://${id}/src/popup/index.html`)
  await popup.evaluate(async (d) => {
    await chrome.storage.local.set({
      settings: { provider: 'anthropic', apiKey: 'made-up', mode: 'byok' },
      resume: { text: 'Pat Lee', filename: 'pat-lee.pdf', updatedAt: new Date().toISOString(), parsed: { name: 'Pat Lee', email: 'pat@example.com', phone: '', website: '', experience: d.exp, education: [] } },
      tailoredHistory: [{ id: 'e1', job: d.job, resume: d.tailored, createdAt: new Date().toISOString() }],
      tailorJob: { id: 't1', status: 'done', job: d.job, resume: d.tailored, startedAt: Date.now(), entryId: 'e1' },
    })
  }, { job, tailored, exp })
  await popup.reload()
  await popup.locator('.letter-actions').first().waitFor()
  await popup.locator('.letter-actions').first().scrollIntoViewIfNeeded()
  await popup.waitForTimeout(300)
  const popupTips = (await popup.locator('.tip').allInnerTexts()).join(' ')
  if (expectTip !== popupTips.includes(SHORTER)) fail(`popup tip: "${popupTips}"`)
  await popup.screenshot({ path: `${out}/${label}-1-popup-result.png` })

  const ed = await ctx.newPage()
  await ed.setViewportSize({ width: 1000, height: 600 })
  await ed.goto(`chrome-extension://${id}/src/editor/index.html?id=e1`)
  const summary = ed.locator('textarea').first()
  await summary.waitFor()
  const section = summary.locator('xpath=ancestor::section[1]')
  const edTips = (await ed.locator('.tip').allInnerTexts()).join(' ')
  if (expectTip !== edTips.includes(SHORTER)) fail(`editor tip: "${edTips}"`)
  await section.screenshot({ path: `${out}/${label}-2-editor-summary.png` })

  if (expectTip) {
    await summary.fill('Full Stack Developer building full-stack, AI-powered applications.')
    await ed.waitForTimeout(300)
    if (await ed.locator('.tip').count()) fail('tip still shown after editing the title out')
    await section.screenshot({ path: `${out}/${label}-3-editor-title-removed.png` })
  }
  console.log(`${label}: popup tip "${popupTips}" | editor tip "${edTips}"`)
} finally {
  await ctx.close()
  rmSync(profile, { recursive: true, force: true })
}
