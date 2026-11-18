// node proof.mjs before|after   (before: master on 3278, after: this branch on 3277)
import { createRequire } from 'node:module'
import fs from 'node:fs'
import assert from 'node:assert/strict'
const require = createRequire('F:/worktrees/cover-me/t3-16154237/extension/package.json')
const { chromium } = require('playwright')

const side = process.argv[2]
const after = side === 'after'
const BASE = `http://localhost:${after ? 3277 : 3278}`
const OUT = 'C:/Users/Lincoln/AppData/Local/Temp/p277/proof'
const PROMPTS = JSON.parse(fs.readFileSync('C:/Users/Lincoln/AppData/Local/Temp/p277/run/prompts.json', 'utf8'))
const NEW = [
  { slug: 'chatgpt-resume-prompts', h1: 'ChatGPT resume prompts', first: PROMPTS.resume[0] },
  { slug: 'chatgpt-cover-letter-prompts', h1: 'ChatGPT cover letter prompts', first: PROMPTS.letter[0] },
]
const log = []
const ok = (msg) => { log.push(`ok  ${msg}`); console.log(`${side} ok  ${msg}`) }

const browser = await chromium.launch({ channel: 'chrome' })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] })
ctx.setDefaultTimeout(120000)
const page = await ctx.newPage()
const go = (path) => page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 180000 })
const shot = (n, name) => page.screenshot({ path: `${OUT}/${side}-${n}-${name}.png` })

for (const [i, g] of NEW.entries()) {
  const res = await go(`/guides/${g.slug}`)
  if (!after) { assert.equal(res.status(), 404); ok(`/guides/${g.slug} is 404`); await shot(i + 1, g.slug); continue }
  assert.equal(res.status(), 200)
  const h1s = await page.locator('h1').allInnerTexts()
  assert.equal(h1s.length, 1); assert.ok(h1s[0].includes(g.h1), h1s[0])
  const title = await page.title()
  assert.ok(title.length < 60, `${title} is ${title.length}`)
  const buttons = page.getByRole('button', { name: 'Copy prompt' })
  assert.equal(await buttons.count(), 4)
  assert.equal(await page.locator('a[href="/guides/cover-me-vs-chatgpt"]').count() > 0, true)
  ok(`/guides/${g.slug}: one H1 "${h1s[0]}", title "${title}" (${title.length} chars), 4 copy buttons, links to /guides/cover-me-vs-chatgpt`)
  await shot(i + 1, g.slug)
  await buttons.first().click()
  await page.getByRole('button', { name: 'Copied' }).waitFor()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  assert.equal(copied.split(String.fromCharCode(13)).join(''), g.first)
  ok(`${g.slug}: Copy prompt puts prompt 1, exactly as run, on the clipboard (Windows line endings normalized) and shows "Copied"`)
  await page.locator('h3').first().scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -100))
  await shot(i + 1, `${g.slug}-copied`)
}

await go('/guides/cover-me-vs-chatgpt')
const links = await Promise.all(NEW.map((g) => page.locator(`main a[href="/guides/${g.slug}"]`).count()))
if (after) { assert.ok(links.every((n) => n > 0)); ok('/guides/cover-me-vs-chatgpt links to both new guides') }
else { assert.deepEqual(links, [0, 0]); ok('/guides/cover-me-vs-chatgpt has no prompt guide links') }
const para = page.locator('main p', { hasText: 'When is' }).first()
await page.getByRole('heading', { name: 'When is ChatGPT the better choice?' }).scrollIntoViewIfNeeded()
await page.evaluate(() => window.scrollBy(0, -100))
await shot(3, 'comparison')

await go('/guides')
const onIndex = await Promise.all(NEW.map((g) => page.locator(`main a[href="/guides/${g.slug}"]`).count()))
assert.ok(after ? onIndex.every((n) => n > 0) : onIndex.every((n) => n === 0)); ok(`/guides index ${after ? 'lists' : "doesn't list"} both new guides`)
await shot(4, 'index')

const footer = page.locator('footer')
const footerLabel = after ? 'ChatGPT resume prompts' : 'Cover Me vs ChatGPT'
const footerHref = after ? '/guides/chatgpt-resume-prompts' : '/guides/cover-me-vs-chatgpt'
assert.equal(await footer.getByRole('link', { name: footerLabel }).getAttribute('href'), footerHref)
if (after) assert.equal(await footer.getByRole('link', { name: 'Cover Me vs ChatGPT' }).count(), 0)
ok(`footer Guides column links "${footerLabel}" to ${footerHref}`)
await footer.scrollIntoViewIfNeeded(); await shot(5, 'footer')

for (const file of ['/sitemap.xml', '/llms.txt']) {
  const body = await (await page.request.get(BASE + file)).text()
  const has = NEW.map((g) => body.includes(`/guides/${g.slug}`))
  assert.ok(after ? has.every(Boolean) : !has.some(Boolean)); ok(`${file} ${after ? 'has' : "doesn't have"} both new guide URLs`)
}

if (after) {
  const m = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })
  await m.addInitScript(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('blocked')) } }) })
  const mp = await m.newPage(); mp.setDefaultTimeout(120000)
  await mp.goto(`${BASE}/guides/chatgpt-resume-prompts`, { waitUntil: 'networkidle' })
  await mp.screenshot({ path: `${OUT}/after-6-mobile-top.png` })
  const btn = mp.getByRole('button', { name: 'Copy prompt' }).first()
  await btn.scrollIntoViewIfNeeded(); await btn.tap()
  const blocked = mp.getByRole('button', { name: "Couldn't copy, select it" }).first()
  await blocked.waitFor()
  const card = blocked.locator('xpath=ancestor::div[contains(@class,"rounded-[16px]")][1]')
  const [b, c] = [await blocked.boundingBox(), await card.boundingBox()]
  assert.ok(b.x + b.width <= c.x + c.width, `button right ${b.x + b.width} > card right ${c.x + c.width}`)
  ok(`375 px: a blocked clipboard shows "Couldn't copy, select it" inside the card (button right edge ${Math.round(b.x + b.width)} px, card ${Math.round(c.x + c.width)} px)`)
  await mp.evaluate(() => window.scrollBy(0, -80))
  await mp.screenshot({ path: `${OUT}/after-7-mobile-blocked.png` })
  await m.close()
}

fs.writeFileSync(`${OUT}/${side}.log`, log.join('\n') + '\n')
await browser.close()
