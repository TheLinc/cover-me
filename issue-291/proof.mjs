// node proof.mjs before|after
// Seeds three two-day-old letters so the rating card qualifies, copies one in History,
// then records the card's and Settings' link targets. Store navigation is blocked so no
// real listing visit is made.
import { createRequire } from 'node:module'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
const require = createRequire('F:/worktrees/cover-me/t3-b0b7db0d/extension/package.json')
const { chromium } = require('playwright')

const phase = process.argv[2]
const EXT = phase === 'before' ? 'F:/tmp-proof-rating/before/extension/dist' : 'F:/worktrees/cover-me/t3-b0b7db0d/extension/dist'
const PROF = `F:/tmp-proof-rating/prof-${phase}`
const OUT = 'F:/tmp-proof-rating/out'
mkdirSync(OUT, { recursive: true })
rmSync(PROF, { recursive: true, force: true })

const ctx = await chromium.launchPersistentContext(PROF, {
  channel: 'chromium', headless: false, viewport: { width: 380, height: 600 },
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'],
})
const storeRequests = []
await ctx.route('https://chromewebstore.google.com/**', (r) => { storeRequests.push(r.request().url()); return r.abort() })
let [sw] = ctx.serviceWorkers()
sw ??= await ctx.waitForEvent('serviceworker')
const id = new URL(sw.url()).host
await ctx.addInitScript(() => { navigator.clipboard.writeText = async () => {} })

const page = await ctx.newPage()
for (const p of ctx.pages()) if (p !== page) await p.close()
await page.goto(`chrome-extension://${id}/src/popup/index.html`)
const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString()
const job = { title: 'Operations Analyst', company: 'Northwind Parcel', description: 'Made-up posting.', url: 'https://jobs.example.com/northwind/ops-analyst' }
await page.evaluate(async ({ job, at }) => {
  const history = [1, 2, 3].map((n) => ({ id: `letter-${n}`, job, letter: `Dear Northwind team,\n\nSample letter ${n}.`, createdAt: at }))
  await chrome.storage.local.set({ history, generationCount: { count: 3, firstAt: at }, activePage: 'history', pageReadAgreed: true })
}, { job, at: twoDaysAgo })
await page.reload()

await page.getByRole('button', { name: 'View' }).first().click()
await page.getByRole('button', { name: 'Copy' }).first().click()
const card = page.locator('.review-ask')
await card.waitFor()
await card.scrollIntoViewIfNeeded()
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/${phase}-1-rating-card.png` })
const cardLinks = await card.locator('a').evaluateAll((as) => as.map((a) => ({ text: a.textContent, href: a.href })))

const opened = ctx.waitForEvent('page')
await card.getByRole('link', { name: 'Rate Cover Me' }).click()
const storeTab = await opened
await storeTab.waitForLoadState().catch(() => {})
const openedUrl = storeRequests[0]
await storeTab.close()

await page.evaluate(() => chrome.storage.local.set({ activePage: 'settings' }))
await page.reload()
const setting = page.locator('section[aria-labelledby="review-links-title"]')
await setting.waitFor()
await setting.scrollIntoViewIfNeeded()
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/${phase}-2-settings.png` })
const settingsLinks = await setting.locator('a').evaluateAll((as) => as.map((a) => ({ text: a.textContent, href: a.href })))

const result = { phase, cardLinks, openedUrl, settingsLinks }
writeFileSync(`${OUT}/${phase}-links.json`, JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))

const tagged = [...cardLinks, ...settingsLinks].filter((l) => /Rate|feedback/.test(l.text)).every((l) => l.href.includes('utm_source=extension'))
if (phase === 'after' && !(tagged && openedUrl.includes('utm_campaign=card'))) throw new Error('after: links are not tagged')
if (phase === 'before' && [...cardLinks, ...settingsLinks].some((l) => l.href.includes('utm_'))) throw new Error('before: links already tagged')
await ctx.close()
