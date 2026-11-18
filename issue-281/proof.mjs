// node proof.mjs <dist> <expected name> <out.png>
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright'

const [dist, expected, out] = [resolve(process.argv[2]), process.argv[3], process.argv[4]]
const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'proof-281-')), {
  channel: 'chromium', headless: false, viewport: { width: 1000, height: 640 },
  args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
})
try {
  const sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker')
  const id = new URL(sw.url()).host
  const page = ctx.pages()[0] ?? await ctx.newPage()
  await page.goto(`chrome://extensions/?id=${id}`)
  const title = page.locator('extensions-detail-view #name')
  await title.waitFor()
  const shown = (await title.innerText()).trim()
  await page.screenshot({ path: out })
  console.log(JSON.stringify({ shown, length: shown.length }))
  if (shown !== expected) throw new Error(`expected "${expected}", got "${shown}"`)
} finally {
  await ctx.close()
}
