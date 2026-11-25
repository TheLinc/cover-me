// SUPABASE_URL=... SUPABASE_SECRET_KEY=... SUPABASE_PUBLISHABLE_KEY=... node redeem-proof.mjs <before|after> <site origin>
// The web app needs NEXT_PUBLIC_POSTHOG_KEY set to any value; headless Chrome is dropped as a bot, so it runs headed.
// Redeems a gift trial link as a fresh made-up user and lists every PostHog event the page sends.
// PostHog requests (/relay/*) are answered in the browser, so nothing leaves the machine.
import { gunzipSync } from 'node:zlib'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs'

import { chromium } from 'playwright'

const [label, site] = process.argv.slice(2)
const API = process.env.SUPABASE_URL // local stack API_URL from `supabase status`
const SECRET = process.env.SUPABASE_SECRET_KEY
const PUBLISHABLE = process.env.SUPABASE_PUBLISHABLE_KEY
const admin = { apikey: SECRET, Authorization: `Bearer ${SECRET}`, 'content-type': 'application/json' }

const email = `proof-${label}-${Date.now()}@cover-me.test`
const password = 'password123'
let res = await fetch(`${API}/auth/v1/admin/users`, { method: 'POST', headers: admin, body: JSON.stringify({ email, password, email_confirm: true }) })
if (!res.ok) throw new Error(`create user: ${res.status} ${await res.text()}`)

const code = randomBytes(12).toString('base64url')
res = await fetch(`${API}/rest/v1/trial_codes`, {
  method: 'POST', headers: { ...admin, Prefer: 'return=minimal' },
  body: JSON.stringify({ code, note: 'proof batch', expires_at: new Date(Date.now() + 86_400_000).toISOString() }),
})
if (!res.ok) throw new Error(`insert code: ${res.status} ${await res.text()}`)

res = await fetch(`${API}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: PUBLISHABLE, 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) })
const session = await res.json()
if (!session.access_token) throw new Error(`sign in: ${JSON.stringify(session)}`)
const value = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url')
const chunks = value.match(/.{1,3180}/g)
const cookies = chunks.map((v, i) => ({ name: chunks.length === 1 ? 'sb-127-auth-token' : `sb-127-auth-token.${i}`, value: v, url: site }))

const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--disable-blink-features=AutomationControlled'] })
// PostHog drops events from a HeadlessChrome user agent as a bot.
const userAgent = (await (await browser.newPage()).evaluate(() => navigator.userAgent)).replace('HeadlessChrome', 'Chrome')
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, userAgent })
await context.addCookies(cookies)
const page = await context.newPage()

const posthogRequests = []
const events = []
await page.route('**/relay/**', async (route) => {
  const req = route.request()
  const url = new URL(req.url())
  posthogRequests.push(`${req.method()} ${url.pathname}`)
  const buf = req.postDataBuffer()
  if (buf && buf.length) {
    let text = buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf).toString() : buf.toString()
    if (text.startsWith('data=')) text = Buffer.from(decodeURIComponent(text.slice(5)), 'base64').toString()
    try {
      const body = JSON.parse(text)
      for (const e of Array.isArray(body) ? body : body.batch ?? [body]) {
        if (e?.event) events.push({ event: e.event, $pathname: e.properties?.$pathname, note: e.properties?.note })
      }
    } catch {
      events.push({ unparsed: `${url.search} ${req.headers()['content-type']} ${text.slice(0, 80)}` })
    }
  }
  await route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":1}' })
})

await page.goto(`${site}/redeem/${code}`, { waitUntil: 'networkidle' })
const button = page.getByRole('button', { name: 'Start my free week' })
await button.waitFor()
await page.waitForTimeout(1500)
await page.screenshot({ path: `${label}-1-redeem.png` })
await button.dispatchEvent('click')
await page.getByText("You're on Pro until").waitFor({ timeout: 30_000 })
await page.waitForTimeout(8000)
await page.screenshot({ path: `${label}-2-redeemed.png` })

const redeemEvents = events.splice(0)
// Control: PostHog is on in this build, so a public page view does get sent.
await page.goto(`${site}/`, { waitUntil: 'networkidle' })
await page.waitForTimeout(6000)
const homeEvents = events.splice(0)
events.push(...redeemEvents)

const redeemed = await (await fetch(`${API}/rest/v1/trial_codes?code=eq.${code}&select=note,redeemed_at`, { headers: admin })).json()
const report = { label, site, posthogRequests, redeemPageEvents: events, homePageEvents: homeEvents, trialCodeRow: redeemed }
fs.writeFileSync(`${label}-events.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
await browser.close()

const sent = events.some((e) => e.event === 'trial_redeemed')
const expected = label === 'before'
if (sent !== expected) {
  console.error(`expected trial_redeemed ${expected ? '' : 'not '}to be sent on ${label}`)
  process.exit(1)
}
