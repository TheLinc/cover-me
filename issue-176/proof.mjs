// node proof.mjs <before|after> [outDir]
// Signs in as the seeded free account on http://localhost:3100 and captures the dashboard.
// "after" expects the temporary test notice in web/lib/notices.ts, closes it, and reloads.
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
const require = createRequire('F:/personal-projects/cover-me/extension/package.json')
const { chromium } = require('playwright')

const mode = process.argv[2]
const out = process.argv[3] ?? 'F:/scratch/proof-176/shots'
const base = 'http://localhost:3100'
const noticesFile = 'F:/personal-projects/cover-me/.claude/worktrees/agent-aea4d340574e93dd6/web/lib/notices.ts'

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined })
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await context.newPage()

await page.goto(`${base}/auth`)
await page.fill('#email', 'free@cover-me.test')
await page.fill('#password', 'password123')
await page.press('#password', 'Enter')
await page.waitForURL('**/dashboard**', { timeout: 60000 })
await page.waitForSelector('text=Recent applications', { timeout: 60000 })
await page.waitForLoadState('networkidle')

const shot = (name, p = page) => p.screenshot({ path: `${out}/${mode}-${name}.png`, fullPage: false })
const board = page.getByText('track your applications on a board')
const testNotice = page.getByText('a sample notice that links to the privacy policy')

if (mode === 'before') {
  await board.waitFor({ timeout: 15000 })
  await shot('1-dashboard')
} else {
  await testNotice.waitFor({ timeout: 15000 })
  if (await board.count()) throw new Error('board notice still shows')
  await shot('1-dashboard')

  await page.setViewportSize({ width: 390, height: 844 })
  await shot('1-dashboard-mobile')
  await page.setViewportSize({ width: 1280, height: 900 })

  await page.getByRole('button', { name: 'Close' }).dispatchEvent('click')
  await page.reload()
  await page.waitForSelector('text=Recent applications')
  await page.waitForTimeout(1500)
  if (await testNotice.count()) throw new Error('closed notice came back after reload')
  await shot('2-closed-reloaded')

  const src = readFileSync(noticesFile, 'utf8')
  writeFileSync(noticesFile, src.replace("id: 'proof-test'", "id: 'proof-test-2'"))
  await page.waitForTimeout(4000)
  await page.reload()
  await testNotice.waitFor({ timeout: 30000 })
  await shot('3-new-id-shows')
  writeFileSync(noticesFile, src)

  console.log('localStorage:', await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('cover-me:notice'))))
}

await browser.close()
console.log(mode, 'ok')
