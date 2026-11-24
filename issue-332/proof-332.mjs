// Proof for #332: node proof-332.mjs <before|after> <baseUrl> <outDir>
// Phones get "Send this to my computer" at each install placement; a sent link opened on a computer shows a return banner.
import { gunzipSync } from 'node:zlib'
import assert from 'node:assert/strict'
import { chromium, devices } from 'file:///F:/scratch/ai-visibility/node_modules/playwright/index.mjs'

const [which, base, out] = process.argv.slice(2)
const after = which === 'after'
// PostHog skips localhost and webdriver browsers, so the app is served as proof.test.
const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP proof.test 127.0.0.1', '--disable-blink-features=AutomationControlled'] })
const events = []

function decode(buf, url) {
  try {
    if (buf[0] === 0x1f && buf[1] === 0x8b) return JSON.parse(gunzipSync(buf).toString())
    const s = buf.toString()
    if (s.startsWith('data=')) return JSON.parse(Buffer.from(decodeURIComponent(s.slice(5)), 'base64').toString())
    return JSON.parse(s)
  } catch {
    return null
  }
}

async function context(opts) {
  const ctx = await browser.newContext(opts)
  await ctx.route('**/relay/**', async (route) => {
    const body = route.request().postDataBuffer()
    if (body) {
      const data = decode(body, route.request().url())
      for (const e of [].concat(data?.batch ?? data ?? [])) if (e?.event) events.push({ event: e.event, ...e.properties })
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":1}' })
  })
  await ctx.route('https://chromewebstore.google.com/**', (r) => r.fulfill({ status: 200, body: 'store' }))
  await ctx.addInitScript(() => {
    window.__shares = []
    Object.defineProperty(navigator, 'share', { configurable: true, value: (d) => (window.__shares.push(d), Promise.resolve()) })
  })
  return ctx
}

const shot = (page, n, name, target) => (target ?? page).screenshot({ path: `${out}/${which}-${n}-${name}.png` })
const rel = (u) => { const x = new URL(u); return x.pathname + x.search }
const lastShare = async (page) => rel(await page.evaluate(() => window.__shares.at(-1)?.url))
const sendUrl = (path, placement) => `${base}${path}?utm_source=share&utm_medium=phone&utm_campaign=${placement}-phone-send`
const sendPath = (path, placement) => rel(sendUrl(path, placement))
// PostHog sends in batches, so let a page flush before leaving it.
const go = async (page, url) => { await page.waitForTimeout(4000); await page.goto(url) }
const settle = (page) => page.waitForTimeout(1500)

// Phone
const phone = await context({ ...devices['Pixel 7'] })
const p = await phone.newPage()
await go(p, base + '/')
await settle(p)
assert.equal(await p.evaluate(() => matchMedia('(pointer: coarse)').matches), true, 'phone emulation is pointer-coarse')
await shot(p, 1, 'phone-hero')
const heroSend = p.locator('section').first().getByRole('button', { name: 'Send this to my computer' })
const heroStore = p.locator('section').first().getByRole('link', { name: /Add to Chrome/ })
if (after) {
  await assert.doesNotReject(heroSend.waitFor({ state: 'visible', timeout: 3000 }))
  assert.equal(await heroStore.isVisible(), false, 'hero store button hidden on a phone')
  await heroSend.click()
  assert.equal(await lastShare(p), sendPath('/', 'hero'))

  const navSend = p.locator('header').getByRole('button', { name: 'Send to computer' })
  await navSend.click()
  assert.equal(await lastShare(p), sendPath('/', 'nav'))

  await p.locator('#pricing').getByRole('button', { name: 'Send this to my computer' }).click()
  assert.equal(await lastShare(p), sendPath('/', 'pricing'))

  const closing = p.locator('#get-started')
  // A viewport shot: capturing an element taller than the viewport drops the touch emulation.
  await closing.evaluate((e) => e.scrollIntoView({ block: 'start' }))
  await settle(p)
  await shot(p, 3, 'phone-closing')
  await closing.getByRole('button', { name: 'Send this to my computer' }).click()
  assert.equal(await lastShare(p), sendPath('/', 'closing'))
} else {
  assert.equal(await heroSend.count(), 0, 'no send button before')
  assert.equal(await heroStore.isVisible(), true)
  const closing = p.locator('#get-started')
  // A viewport shot: capturing an element taller than the viewport drops the touch emulation.
  await closing.evaluate((e) => e.scrollIntoView({ block: 'start' }))
  await settle(p)
  await shot(p, 3, 'phone-closing')
}

await p.evaluate(() => {
  const story = document.getElementById('how-it-works').getBoundingClientRect()
  window.scrollBy(0, story.bottom - innerHeight + 40)
})
await settle(p)
await shot(p, 8, 'phone-dock')
if (after) {
  const dockSend = p.getByRole('button', { name: 'Send to computer' }).last()
  await dockSend.click()
  assert.equal(await lastShare(p), sendPath('/', 'dock'))
}

await go(p, base + '/guides/tailor-resume-to-job-description')
await settle(p)
const guideCta = p.locator('#get-cover-me').locator('..')
await guideCta.scrollIntoViewIfNeeded()
await shot(p, 4, 'phone-guide', guideCta)
if (after) {
  await guideCta.getByRole('button', { name: 'Send this to my computer' }).click()
  assert.equal(await lastShare(p), sendPath('/guides/tailor-resume-to-job-description', 'guide'))
}

await go(p, base + '/for/linkedin')
await settle(p)
const forCta = p.getByRole('heading', { name: /Try it on your next/ }).locator('..')
await forCta.scrollIntoViewIfNeeded()
await shot(p, 5, 'phone-for-board', forCta)
if (after) {
  await forCta.getByRole('button', { name: 'Send this to my computer' }).click()
  assert.equal(await lastShare(p), sendPath('/for/linkedin', 'for-board'))
}

await go(p, base + '/ats-checker')
await settle(p)
const atsSend = p.getByRole('button', { name: 'Send this to my computer' }).last()
await atsSend.scrollIntoViewIfNeeded()
await atsSend.click()
assert.equal(await lastShare(p), sendPath('/ats-checker', 'ats'), 'ATS checker send keeps its campaign')

// Narrowest phone: the nav must still fit
const small = await context({ ...devices['Pixel 7'], viewport: { width: 320, height: 640 } })
const s = await small.newPage()
await go(s, base + '/')
await settle(s)
await shot(s, 2, 'phone-320-nav', s.locator('header'))
assert.ok((await s.evaluate(() => document.documentElement.scrollWidth)) <= 320, 'no sideways scroll at 320px')

// Computer, opening the link sent from a phone
const desk = await context({ ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } })
const d = await desk.newPage()
await go(d, sendUrl('/', 'hero'))
await settle(d)
await shot(d, 6, 'desktop-return')
const banner = d.getByText('Sent from your phone?')
if (after) {
  await assert.doesNotReject(banner.waitFor({ timeout: 3000 }))
  const install = d.getByRole('link', { name: 'Install Cover Me free' })
  assert.equal(new URL(await install.getAttribute('href')).searchParams.get('utm_campaign'), 'hero-phone-send')
  const popup = d.waitForEvent('popup')
  await install.click()
  await (await popup).close()
} else {
  assert.equal(await banner.count(), 0, 'no return banner before')
}

await go(d, sendUrl('/ats-checker', 'ats'))
await settle(d)
await d.getByText('Sent from your phone?').waitFor({ timeout: 5000 })
await shot(d, 7, 'desktop-ats-return')

await go(d, base + '/')
await settle(d)
assert.equal(await d.getByText('Sent from your phone?').count(), 0, 'no banner on a plain visit')
assert.equal(await d.locator('section').first().getByRole('link', { name: /Add to Chrome/ }).isVisible(), true, 'desktop keeps the store button')

await d.waitForTimeout(6000)
await browser.close()

const sends = events.filter((e) => e.event === 'phone_send').map((e) => e.placement)
const returns = events.filter((e) => e.event === 'store_link_clicked' && e.campaign?.endsWith('-phone-send')).map((e) => e.campaign)
console.log(JSON.stringify({ which, sends, returns }))
if (after) {
  assert.deepEqual([...new Set(sends)].sort(), ['ats', 'closing', 'dock', 'for-board', 'guide', 'hero', 'nav', 'pricing'])
  assert.ok(returns.includes('hero-phone-send'), 'store_link_clicked carries the phone-send campaign')
} else {
  assert.deepEqual(sends, [])
}
console.log(`${which}: all assertions passed`)
