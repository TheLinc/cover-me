// node proof-auth-switch.cjs <before|after> <web base url> <out dir>
// Needs a local Supabase on 56321 with ada.moss@example.com and ben.cole@example.com (password proof-pass-123).
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright')
const assert = require('node:assert')
const path = require('node:path')

const [, , phase, base, out] = process.argv
const SUPABASE = 'http://127.0.0.1:56321'
const KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'
const PASS = 'proof-pass-123'
const ADA = 'ada.moss@example.com'
const BEN = 'ben.cole@example.com'
const after = phase === 'after'

async function tokens(email) {
  const res = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASS }),
  })
  const s = await res.json()
  assert.ok(s.access_token, JSON.stringify(s))
  return s
}

async function link(email, type) {
  const s = await tokens(email)
  return `${base}/auth#access_token=${s.access_token}&expires_at=${s.expires_at}&expires_in=3600&refresh_token=${s.refresh_token}&token_type=bearer&type=${type}`
}

async function signInAs(page, email) {
  await page.goto(`${base}/auth`)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASS)
  await page.getByRole('button', { name: /^Sign in$/ }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 60000 })
}

async function settingsEmail(page) {
  await page.goto(`${base}/dashboard/settings`)
  await page.waitForLoadState('networkidle')
  const text = await page.locator('body').innerText()
  return text.includes(BEN) ? BEN : text.includes(ADA) ? ADA : 'none'
}

async function shot(page, name) {
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(out, `${phase}-${name}.png`) })
}

;(async () => {
  const browser = await chromium.launch({ channel: 'chrome' })
  const viewport = { width: 1280, height: 800 }

  // 1. Signed in as Ada, open a signup link carrying Ben's tokens.
  {
    const ctx = await browser.newContext({ viewport })
    const page = await ctx.newPage()
    await signInAs(page, ADA)
    assert.strictEqual(await settingsEmail(page), ADA)
    await page.goto(await link(BEN, 'signup'))
    if (after) {
      await page.getByRole('heading', { name: 'Switch accounts?' }).waitFor()
      await shot(page, '1-link-while-signed-in')
      const mobile = await ctx.newPage()
      await mobile.setViewportSize({ width: 390, height: 844 })
      await mobile.goto(await link(BEN, 'signup'))
      await mobile.getByRole('heading', { name: 'Switch accounts?' }).waitFor()
      await shot(mobile, '1-link-while-signed-in-mobile')
      await mobile.close()
      await page.getByRole('button', { name: `Stay as ${ADA}` }).click()
      await page.waitForURL(/\/dashboard/)
    } else {
      await page.getByRole('heading', { name: 'Email confirmed.' }).waitFor()
      await page.waitForTimeout(1500)
      await shot(page, '1-link-while-signed-in')
    }
    const who = await settingsEmail(page)
    await shot(page, '2-account-afterwards')
    assert.strictEqual(who, after ? ADA : BEN, `signed in as ${who}`)
    await ctx.close()
  }

  // 3. Same, but choose Switch (after only; before switches without asking).
  if (after) {
    const ctx = await browser.newContext({ viewport })
    const page = await ctx.newPage()
    await signInAs(page, ADA)
    await page.goto(await link(BEN, 'signup'))
    await page.getByRole('button', { name: `Switch to ${BEN}` }).click()
    await page.getByText(`You're signed in as ${BEN}`).waitFor()
    await shot(page, '3-after-switch')
    assert.strictEqual(await settingsEmail(page), BEN)
    await ctx.close()
  }

  // 4. Extension signup: nobody signed in, open Ben's signup link.
  {
    const ctx = await browser.newContext({ viewport })
    const page = await ctx.newPage()
    await page.goto(await link(BEN, 'signup'))
    await page.getByRole('heading', { name: 'Email confirmed.' }).waitFor()
    if (after) await page.getByText(`You're signed in as ${BEN}`).waitFor()
    else await page.waitForTimeout(1500)
    await shot(page, '4-signup-link-signed-out')
    assert.strictEqual(await settingsEmail(page), BEN)
    await ctx.close()
  }

  // 5. Recovery link, nobody signed in: the reset form.
  {
    const ctx = await browser.newContext({ viewport })
    const page = await ctx.newPage()
    await page.goto(await link(BEN, 'recovery'))
    await page.getByRole('heading', { name: 'Set a new password.' }).waitFor()
    if (after) await page.getByText(`For ${BEN}`).waitFor()
    else await page.waitForTimeout(1500)
    await shot(page, '5-reset-link')
    await ctx.close()
  }

  await browser.close()
  console.log(`${phase}: ok`)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
