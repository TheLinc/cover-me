// Usage: tsx proof-377.ts <before|after> <dist folder> <out folder>
// Loads the build at version 1.9.0, with Chrome's update check answering
// "1.10.0 is available", since an unpacked build never gets store updates.
import { cpSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { launchExtension, seedOwnKey } from 'file:///F:/worktrees/cover-me/t3-d71113d4-f14eaaf5ce0aa606/extension/scripts/e2e.ts'

const [phase, srcDist, out] = process.argv.slice(2)
const dist = resolve(out, `dist-${phase}`)
rmSync(dist, { recursive: true, force: true })
cpSync(srcDist, dist, { recursive: true })
mkdirSync(out, { recursive: true })
const manifestPath = join(dist, 'manifest.json')
const setVersion = (v: string) => {
  const m = JSON.parse(readFileSync(manifestPath, 'utf8'))
  m.version = v
  writeFileSync(manifestPath, JSON.stringify(m, null, 2))
}
setVersion('1.9.0')

function check(ok: boolean, what: string) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${phase}: ${what}`)
  if (!ok) process.exitCode = 1
}

const { ctx, popupUrl } = await launchExtension({ dist })
await ctx.addInitScript(() => {
  if (!location.href.startsWith('chrome-extension://')) return
  const w = window as unknown as { updateChecks: number }
  w.updateChecks = 0
  chrome.runtime.requestUpdateCheck = (async () => {
    w.updateChecks++
    return { status: 'update_available', version: '1.10.0' }
  }) as typeof chrome.runtime.requestUpdateCheck
})
for (const p of ctx.pages()) if (p.url().includes('welcome')) await p.close()
// Chromium disables an unpacked extension on reload unless developer mode is on.
const settings = await ctx.newPage()
await settings.goto('chrome://extensions')
await settings.evaluate(() => (chrome as unknown as { developerPrivate: { updateProfileConfiguration(c: object): Promise<void> } }).developerPrivate.updateProfileConfiguration({ inDeveloperMode: true }))
await settings.close()

const popup = await ctx.newPage()
await popup.setViewportSize({ width: 380, height: 560 })
await popup.goto(popupUrl)
await popup.waitForTimeout(800)
const checksOnOpen = await popup.evaluate(() => (window as unknown as { updateChecks: number }).updateChecks)
await seedOwnKey(popup, { provider: 'claude', apiKey: 'sk-ant-fake-key-for-proof', resumeText: 'Jordan Rivera\nProduct designer at Northwind Studio, 2019 to now.' })
await popup.waitForTimeout(1000)
const version = () => popup.evaluate(() => chrome.runtime.getManifest().version)
const update = popup.locator('header').getByRole('button', { name: 'Update' })
const status = popup.locator('header [role=status]')
const headerFits = () => popup.locator("header").evaluate((h) => [...h.querySelectorAll("span, a, button")].every((c) => c.getClientRects().length <= 1 && (c as HTMLElement).offsetHeight <= 26) && h.scrollWidth <= h.clientWidth && [...h.children].every((c) => c.getBoundingClientRect().right <= h.getBoundingClientRect().right))

check(await version() === '1.9.0', 'running 1.9.0')
await popup.screenshot({ path: join(out, `${phase}-1-open.png`) })

if (phase === 'before') {
  check(checksOnOpen === 0, 'opening the popup never asks Chrome for an update')
  check(await update.count() === 0, 'no Update button')
} else {
  check(checksOnOpen === 1, 'opening the popup asks Chrome for an update once')
  check(await update.isVisible(), 'Update button in the header')
  check(await update.getAttribute('title') === 'Cover Me 1.10.0 is ready. Restart to update.', 'its tooltip names 1.10.0')
  check(await popup.locator('section', { hasText: 'is ready' }).count() === 0, 'no card in the page')

  await popup.evaluate(() => chrome.storage.local.set({ tailorJob: { id: 'proof', status: 'loading', job: { title: 'Senior Product Designer', company: 'Fabrikam', description: 'Design things.', url: '' }, startedAt: Date.now() } }))
  await popup.waitForTimeout(500)
  check(await update.count() === 0 && await status.innerText() === 'Tailoring…', 'hidden while a resume is tailoring, status shows the run')
  await popup.screenshot({ path: join(out, `${phase}-2-tailoring.png`) })

  await popup.evaluate(() => chrome.storage.local.set({ whatsNew: '1.9.0', tailorJob: { id: 'proof', status: 'error', error: 'Could not read this page. Try refreshing, or paste the job description manually.', job: { title: 'Senior Product Designer', company: 'Fabrikam', description: 'Design things.', url: '' }, startedAt: Date.now() } }))
  await popup.reload()
  await popup.waitForTimeout(800)
  check(await update.isVisible() && await status.innerText() === 'Tailoring failed', 'back once the run ends')
  check(await headerFits(), "fits beside What's new and the longest status")
  check(await popup.evaluate(() => (window as unknown as { updateChecks: number }).updateChecks) === 0, 'reopening within the hour does not ask again')
  await popup.screenshot({ path: join(out, `${phase}-3-crowded-header.png`) })

  await popup.evaluate(() => chrome.storage.local.remove(['tailorJob']))
  setVersion('1.10.0')
  const closed = popup.waitForEvent('close', { timeout: 10_000 }).then(() => true, () => false)
  await update.click()
  check(await closed, 'Update closes the popup')

  const reopened = await ctx.newPage()
  await reopened.setViewportSize({ width: 380, height: 560 })
  for (let i = 0; ; i++) {
    await new Promise((r) => setTimeout(r, 1000))
    try { await reopened.goto(popupUrl); break } catch (e) { if (i > 15) throw e }
  }
  await reopened.waitForTimeout(1500)
  check(await reopened.evaluate(() => chrome.runtime.getManifest().version) === '1.10.0', 'next open runs 1.10.0')
  check(await reopened.locator('header').getByRole('button', { name: 'Update' }).count() === 0, 'and shows no Update button')
  await reopened.screenshot({ path: join(out, `${phase}-4-after-restart.png`) })
}

await ctx.close()
