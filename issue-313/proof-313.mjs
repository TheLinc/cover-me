// Proof for #313. Usage: node proof-313.mjs <before|after> <baseUrl> <outDir>
// Needs the local Supabase stack (seed account free@cover-me.test / password123)
// and a production build of web/ (`next build` + `next start`): `next dev` also
// renders /auth on the server, which a visitor never gets.
import { createRequire } from 'node:module'
import { mkdirSync, readdirSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'

const require = createRequire(process.env.PLAYWRIGHT_FROM ?? import.meta.url)
const { chromium } = require('playwright')

const [label, base, out] = process.argv.slice(2)
const after = label === 'after'
const SUPABASE = 'http://127.0.0.1:54321'
const DESKTOP = { width: 1280, height: 800 }
const PHONE = { width: 390, height: 844 }
mkdirSync(out, { recursive: true })
const shot = (page, n, step) => page.screenshot({ path: join(out, `${label}-${n}-${step}.png`) })

const browser = await chromium.launch()

async function signIn(context) {
  const page = await context.newPage()
  await page.goto(`${base}/auth`)
  await page.locator('input[type=email]').fill('free@cover-me.test')
  await page.locator('input[type=password]').fill('password123')
  await page.locator('form button[type=submit]').click()
  await page.waitForURL(/\/dashboard/)
  await page.close()
}

async function accountLink(page) {
  await page.waitForLoadState('networkidle')
  const header = page.locator('header')
  return { dashboard: header.getByRole('link', { name: 'Dashboard', exact: true }), signIn: header.getByRole('link', { name: 'Sign in', exact: true }) }
}

// 1. Signed out: the header offers Sign in on both versions.
{
  const context = await browser.newContext({ viewport: DESKTOP })
  const page = await context.newPage()
  await page.goto(base)
  const { signIn, dashboard } = await accountLink(page)
  assert.equal(await signIn.isVisible(), true, 'signed out: Sign in shows')
  assert.equal(await dashboard.count(), 0, 'signed out: no Dashboard link')
  await shot(page, 1, 'signed-out-header')
  await context.close()
}

// 2-3. Signed in: the desktop header and the phone menu.
const signedIn = await browser.newContext({ viewport: DESKTOP })
await signIn(signedIn)
{
  const page = await signedIn.newPage()
  await page.goto(base)
  const { signIn, dashboard } = await accountLink(page)
  if (after) {
    assert.equal(await dashboard.isVisible(), true, 'after: Dashboard shows when signed in')
    assert.equal(await dashboard.getAttribute('href'), '/dashboard')
    assert.equal(await signIn.count(), 0, 'after: no Sign in when signed in')
  } else {
    assert.equal(await signIn.isVisible(), true, 'before: Sign in shows even when signed in')
  }
  await shot(page, 2, 'signed-in-header')

  await page.setViewportSize(PHONE)
  await page.getByRole('button', { name: 'Open menu' }).click()
  const menu = page.getByRole('dialog')
  await menu.waitFor()
  await page.waitForTimeout(400)
  const menuLink = menu.getByRole('link', { name: after ? 'Dashboard' : 'Sign in', exact: true })
  assert.equal(await menuLink.isVisible(), true, `${label}: phone menu shows ${after ? 'Dashboard' : 'Sign in'}`)
  if (after) assert.equal(await menu.getByRole('link', { name: 'Sign in', exact: true }).count(), 0)
  await shot(page, 3, 'signed-in-phone-menu')
  await page.close()
}

// 4. Signed in, open /auth. getUser is held for 1.5s, standing in for the
// round trip to hosted Supabase, so the frame before the redirect is visible.
{
  const video = join(out, `${label}-video`)
  const context = await browser.newContext({ viewport: DESKTOP, storageState: await signedIn.storageState(), recordVideo: { dir: video, size: DESKTOP } })
  await context.route(`${SUPABASE}/auth/v1/user`, async (route) => {
    await new Promise((r) => setTimeout(r, 1500))
    await route.continue()
  })
  await context.addInitScript(() => {
    if (location.pathname !== '/auth') return
    const check = () => {
      if (document.querySelector('input[type=email]')) sessionStorage.setItem('sawForm', '1')
    }
    new MutationObserver(check).observe(document, { childList: true, subtree: true })
  })
  const page = await context.newPage()
  await page.goto(`${base}/auth`)
  await page.waitForTimeout(700)
  await shot(page, 4, 'signed-in-auth-while-checking')
  await page.waitForURL(/\/dashboard$/)
  const sawForm = await page.evaluate(() => sessionStorage.getItem('sawForm') === '1')
  assert.equal(sawForm, !after, after ? 'after: no sign-in form before the dashboard' : 'before: the sign-in form flashes')
  await page.close()
  await context.close()
  const file = readdirSync(video).find((f) => f.endsWith('.webm'))
  renameSync(join(video, file), join(out, `${label}-4-signed-in-auth.webm`))
}

// 5. Signed in, /auth?plan=pro still ends on /dashboard?upgrade=1.
{
  const page = await signedIn.newPage()
  await page.goto(`${base}/auth?plan=pro`)
  await page.waitForURL(/\/dashboard\?upgrade=1/)
  await page.close()
}

// 6. A session cookie the server rejects: sign out everywhere through the
// API, keep the browser's cookie, then open /auth. The form shows and stays.
{
  const state = await signedIn.storageState()
  const parts = state.cookies.filter((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name)).sort((a, b) => a.name.localeCompare(b.name))
  const session = JSON.parse(Buffer.from(parts.map((c) => c.value).join('').replace(/^base64-/, ''), 'base64url').toString())
  const res = await fetch(`${SUPABASE}/auth/v1/logout?scope=global`, { method: 'POST', headers: { apikey: process.env.SUPABASE_KEY, Authorization: `Bearer ${session.access_token}` } })
  assert.equal(res.status, 204, 'revoked the session on the server')

  const context = await browser.newContext({ viewport: DESKTOP, storageState: state })
  const page = await context.newPage()
  await page.goto(`${base}/auth`)
  await page.waitForTimeout(3000)
  assert.match(page.url(), /\/auth$/, 'stale cookie: stays on /auth')
  assert.equal(await page.locator('input[type=email]').isVisible(), true, 'stale cookie: the form shows')
  await shot(page, 5, 'rejected-session-auth')
  await context.close()
}

await signedIn.close()
await browser.close()
console.log(`${label}: all assertions passed`)
