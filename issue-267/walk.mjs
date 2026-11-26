// node walk.mjs <extension dir with node_modules> <dist dir> <before|after> <out dir>
import { createRequire } from 'node:module'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'

const [extDir, dist, label, out] = process.argv.slice(2)
const { chromium } = createRequire(join(extDir, 'package.json'))('playwright')
const after = label === 'after'
const PASSWORD = 'proof-pass-267'
const profile = mkdtempSync(join(tmpdir(), 'proof267-'))

const ctx = await chromium.launchPersistentContext(profile, {
  channel: 'chromium',
  headless: false,
  args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
})
try {
  let [sw] = ctx.serviceWorkers()
  if (!sw) sw = await ctx.waitForEvent('serviceworker')
  const id = new URL(sw.url()).host

  const popup = await ctx.newPage()
  await popup.setViewportSize({ width: 380, height: 600 })
  await popup.goto(`chrome-extension://${id}/src/popup/index.html`)
  await popup.evaluate(() => chrome.storage.local.set({ activePage: 'settings' }))
  await popup.reload()
  const keyLink = popup.getByRole('button', { name: 'I have an API key →' })
  const shot = (page, name) => page.screenshot({ path: join(out, `${label}-${name}.png`), fullPage: true })

  await keyLink.waitFor()
  await shot(popup, '1-signed-out-settings')

  const welcome = await ctx.newPage()
  await welcome.setViewportSize({ width: 900, height: 900 })
  await welcome.goto(`chrome-extension://${id}/src/welcome/index.html`)
  const welcomeLink = welcome.getByRole('button', { name: 'I have an API key →' })
  await welcomeLink.waitFor()
  await welcomeLink.scrollIntoViewIfNeeded()
  await shot(welcome, '2-signed-out-welcome')

  await popup.bringToFront()
  await keyLink.click()
  await popup.getByText('API Key', { exact: true }).waitFor()
  await shot(popup, '3-key-form')
  await popup.getByRole('button', { name: 'Use a free Cover Me account instead →' }).click()

  async function signIn(email) {
    await popup.getByPlaceholder('you@example.com').fill(email)
    await popup.getByPlaceholder('••••••••').fill(PASSWORD)
    await popup.getByRole('button', { name: 'Sign In', exact: true }).click()
    await popup.locator('.account-email', { hasText: email }).waitFor()
  }

  await signIn('proof267-free@example.com')
  await popup.locator('.tier-badge', { hasText: 'Free' }).waitFor()
  await popup.getByRole('heading', { name: 'Go Pro' }).waitFor()
  await shot(popup, '4-free-settings')
  assert.equal(await keyLink.count(), after ? 0 : 1, 'free account key link')

  await welcome.bringToFront()
  await welcome.getByText('Signed in as proof267-free@example.com').waitFor()
  await welcome.getByRole('button', { name: 'Change your account or API key' }).click()
  await welcome.locator('.account-email', { hasText: 'proof267-free@example.com' }).waitFor()
  await welcome.waitForTimeout(800)
  await shot(welcome, '5-free-welcome')
  assert.equal(await welcomeLink.count(), after ? 0 : 1, 'welcome tab key link')

  await popup.bringToFront()
  await popup.getByRole('button', { name: 'Sign out' }).click()
  await signIn('proof267-pro@example.com')
  await popup.locator('.tier-badge', { hasText: '★ Pro' }).waitFor()
  await shot(popup, '6-pro-settings')
  assert.equal(await keyLink.count(), after ? 0 : 1, 'pro account key link')
  await popup.getByRole('button', { name: 'Sign out' }).click()
  console.log(`${label}: all assertions passed`)
} finally {
  await ctx.close()
  rmSync(profile, { recursive: true, force: true })
}
