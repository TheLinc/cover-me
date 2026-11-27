// Runs the built popup over live postings in a fresh, signed-out Chromium profile.
// A temp copy of dist gets <all_urls> host access, standing in for the activeTab grant a toolbar click gives.
// The worker's fetch is stubbed, so nothing reaches Cover Me's server or an AI.
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
const [extDir, outDir, ...urls] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const { chromium } = await import(pathToFileURL(join(extDir, 'node_modules/playwright/index.mjs')).href)
const dist = mkdtempSync(join(tmpdir(), 'cm346dist-'))
cpSync(resolve(extDir, 'dist'), dist, { recursive: true })
const manifest = JSON.parse(readFileSync(join(dist, 'manifest.json'), 'utf8'))
manifest.host_permissions = [...manifest.host_permissions, '<all_urls>']
writeFileSync(join(dist, 'manifest.json'), JSON.stringify(manifest))
const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'cm346live-')), {
  channel: 'chromium', headless: false, viewport: { width: 1280, height: 900 },
  args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
})
const sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker')
await sw.evaluate(() => { self.__fetches = []; self.fetch = async (i) => { self.__fetches.push(String(i?.url ?? i)); return new Response('{}', { status: 503 }) } })
const popupUrl = `chrome-extension://${new URL(sw.url()).host}/src/popup/index.html`
for (const [i, url] of urls.entries()) {
  const page = await ctx.newPage()
  const t0 = Date.now()
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) console.log('  ' + (Date.now() - t0) + 'ms nav ->', f.url().slice(0, 90)) })
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(Number(process.env.SETTLE ?? 1500))
  const landed = page.url()
  await page.screenshot({ path: join(outDir, `page-${i}.png`) })
  const popup = await ctx.newPage()
  await popup.setViewportSize({ width: 380, height: 560 })
  await popup.goto(popupUrl)
  await popup.evaluate(async (landed) => {
    await chrome.storage.local.set({
      session: { access_token: 'fake-token', refresh_token: 'fake', expires_at: 4102444800, user: { id: '00000000-0000-0000-0000-000000000346', email: 'sam.rivera@example.com' } },
      pageReadAgreed: true, answersNews: 'seen',
      resume: { text: 'Sam Rivera. Backend engineer.', filename: 'resume.pdf', updatedAt: new Date().toISOString() },
      generatePage: { state: 'idle', inputMode: 'auto' },
    })
    const tab = (await chrome.tabs.query({})).find((t) => t.url === landed)
    await chrome.windows.create({ tabId: tab.id, focused: true })
  }, landed)
  console.log('  moved tab, page url', page.url().slice(0, 80), (Date.now() - t0) + 'ms')
  await sw.evaluate(() => { self.__fetches = [] })
  await popup.reload()
  console.log('  popup reloaded', (Date.now() - t0) + 'ms')
  for (const ms of [0, 1500, 4000]) { await popup.waitForTimeout(ms ? 1500 : 0); console.log('  page state', JSON.stringify(await page.evaluate(() => ({ href: location.href.slice(0, 80), title: document.title.slice(0, 60), h1: document.querySelector('h1')?.innerText?.slice(0, 60), hidden: document.hidden })))) }
  await popup.locator('.posting-card:not(.posting-reading), .posting-empty').waitFor({ timeout: 20000 })
  await popup.waitForTimeout(2000)
  const card = await popup.locator('.posting-card, .posting-empty').first().innerText()
  const img = popup.locator('img.posting-logo')
  const logo = (await img.count()) ? await img.evaluate((i) => ({ src: i.src.slice(0, 120), size: `${i.naturalWidth}x${i.naturalHeight}` })) : null
  await popup.locator('body').screenshot({ path: join(outDir, `popup-${i}.png`) })
  if (process.env.DIAG) {
    console.log('probe in page:', JSON.stringify(await page.evaluate(readFileSync(new URL('./probe.js', import.meta.url), 'utf8'))))
    console.log('ld blocks:', await page.locator('script[type="application/ld+json"]').count())
    console.log('preview:', JSON.stringify(await popup.evaluate(() => chrome.runtime.sendMessage({ type: 'PREVIEW_TAB' }))).slice(0, 300))
    console.log('click read:', JSON.stringify(await popup.evaluate(() => chrome.runtime.sendMessage({ type: 'SCRAPE_TAB' }))).slice(0, 400))
  }
  console.log(JSON.stringify({ url, landed: landed.slice(0, 100), card: card.replace(/\n/g, ' | '), logo, workerFetches: await sw.evaluate(() => self.__fetches) }))
  await popup.close(); await page.close()
}
await ctx.close()
