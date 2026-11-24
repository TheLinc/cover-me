// node proof-auth-switch.cjs <before|after> <web base url> <out dir>
// Needs a local Supabase at SUPABASE_URL (default http://127.0.0.1:56321) with publishable key SUPABASE_KEY,
// and confirmed users ada.moss@example.com and ben.cole@example.com (password proof-pass-123).
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright')
const assert = require('node:assert')
const path = require('node:path')

const [, , phase, base, out] = process.argv
const SUPABASE = process.env.SUPABASE_URL || 'http://127.0.0.1:56321'
const KEY = process.env.SUPABASE_KEY
const PASS = 'proof-pass-123'
const ADA = 'ada.moss@example.com'
const BEN = 'ben.cole@example.com'
const LINK_ERROR = "This link couldn't sign you in."
const after = phase === 'after'
const results = []

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

function linkFor(s, type) {
  return `${base}/auth#access_token=${s.access_token}&expires_at=${s.expires_at}&expires_in=3600&refresh_token=${s.refresh_token}&token_type=bearer&type=${type}`
}

async function link(email, type) {
  return linkFor(await tokens(email), type)
}

async function revokedLink(email) {
  const s = await tokens(email)
  const res = await fetch(`${SUPABASE}/auth/v1/logout?scope=global`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${s.access_token}` },
  })
  assert.ok(res.ok, `logout ${res.status}`)
  return linkFor(s, 'signup')
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
  if (!/\/dashboard/.test(page.url())) return 'none'
  const text = await page.locator('body').innerText()
  return text.includes(BEN) ? BEN : text.includes(ADA) ? ADA : 'none'
}

async function shot(page, name) {
  await page.waitForTimeout(800)
  // Hides the next dev indicator, which shows an LCP image warning on both versions.
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' })
  await page.screenshot({ path: path.join(out, `${phase}-${name}.png`) })
}

async function flow(name, fn) {
  try {
    await fn()
    results.push(`${name}: pass`)
  } catch (e) {
    results.push(`${name}: FAIL ${e.message.split('\n')[0]}`)
  }
}

;(async () => {
  const browser = await chromium.launch({ channel: 'chrome' })
  const viewport = { width: 1280, height: 800 }
  const fresh = async () => {
    const ctx = await browser.newContext({ viewport })
    return { ctx, page: await ctx.newPage() }
  }

  await flow('1 signed in as Ada, open Ben signup link', async () => {
    const { ctx, page } = await fresh()
    await signInAs(page, ADA)
    assert.strictEqual(await settingsEmail(page), ADA)
    await page.goto(await link(BEN, 'signup'))
    if (after) {
      await page.getByRole('heading', { name: 'Switch accounts?' }).waitFor()
      await page.getByText(`You're signed in as ${ADA}`).waitFor()
      await page.getByText(`This link is for ${BEN}`).waitFor()
      await shot(page, '1-link-while-signed-in')
      const mobile = await ctx.newPage()
      await mobile.setViewportSize({ width: 390, height: 844 })
      await mobile.goto(await link(BEN, 'signup'))
      await mobile.getByRole('heading', { name: 'Switch accounts?' }).waitFor()
      await shot(mobile, '1-link-while-signed-in-mobile')
      await mobile.close()
    } else {
      await page.getByRole('heading', { name: 'Email confirmed.' }).waitFor()
      await page.waitForTimeout(1500)
      await shot(page, '1-link-while-signed-in')
      const who = await settingsEmail(page)
      await shot(page, '2-account-afterwards')
      assert.strictEqual(who, BEN, `master should have switched silently, signed in as ${who}`)
    }
    await ctx.close()
  })

  if (after) {
    await flow('2 Stay signed in keeps Ada', async () => {
      const { ctx, page } = await fresh()
      await signInAs(page, ADA)
      await page.goto(await link(BEN, 'signup'))
      await page.getByRole('button', { name: 'Stay signed in' }).click()
      await page.waitForURL(/\/dashboard/)
      const who = await settingsEmail(page)
      await shot(page, '2-account-afterwards')
      assert.strictEqual(who, ADA, `signed in as ${who}`)
      await ctx.close()
    })

    await flow('3 Switch accounts signs in Ben', async () => {
      const { ctx, page } = await fresh()
      await signInAs(page, ADA)
      await page.goto(await link(BEN, 'signup'))
      await page.getByRole('button', { name: 'Switch accounts' }).click()
      await page.getByText(`You're signed in as ${BEN}`).waitFor()
      await shot(page, '3-after-switch')
      assert.strictEqual(await settingsEmail(page), BEN)
      await ctx.close()
    })
  }

  await flow('4 confirmed view names the signed-in account', async () => {
    const { ctx, page } = await fresh()
    await page.goto(await link(BEN, 'signup'))
    await page.getByRole('heading', { name: 'Email confirmed.' }).waitFor()
    if (after) await page.getByText(`You're signed in as ${BEN}`).waitFor()
    else {
      await page.waitForTimeout(1500)
      assert.ok(!(await page.locator('body').innerText()).includes(BEN), 'master names the account')
    }
    await shot(page, '4-signup-link-signed-out')
    assert.strictEqual(await settingsEmail(page), BEN)
    await ctx.close()
  })

  await flow('5 recovery link names the account', async () => {
    const { ctx, page } = await fresh()
    await page.goto(await link(BEN, 'recovery'))
    await page.getByRole('heading', { name: 'Set a new password.' }).waitFor()
    if (after) await page.getByText(`For ${BEN}`).waitFor()
    else await page.waitForTimeout(1500)
    await shot(page, '5-reset-link')
    await ctx.close()
  })

  await flow('6 revoked link', async () => {
    const { ctx, page } = await fresh()
    await page.goto(await revokedLink(BEN))
    await page.waitForTimeout(2500)
    await shot(page, '6-revoked-link')
    const text = await page.locator('body').innerText()
    if (after) {
      assert.ok(text.includes(LINK_ERROR), 'no link error')
      await page.getByRole('button', { name: /^Sign in$/ }).waitFor()
      assert.ok(!text.includes('Email confirmed.'), 'shows confirmed')
    } else {
      assert.ok(!text.includes(LINK_ERROR) && text.includes('Email confirmed.'), 'master should show Email confirmed with no error')
    }
    console.log(`${phase} revoked link page:\n${text.slice(0, 300)}\n---`)
    assert.strictEqual(await settingsEmail(page), 'none')
    await ctx.close()
  })

  await flow('7 malformed tokens', async () => {
    const { ctx, page } = await fresh()
    await page.goto(`${base}/auth#access_token=not-a-token&expires_at=0&expires_in=3600&refresh_token=nope&token_type=bearer&type=signup`)
    await page.waitForTimeout(2500)
    const text = await page.locator('body').innerText()
    if (after) {
      assert.ok(text.includes(LINK_ERROR), 'no link error')
      await shot(page, '7-malformed-link')
    } else {
      assert.ok(!text.includes(LINK_ERROR) && text.includes('Email confirmed.'), 'master should show Email confirmed with no error')
    }
    console.log(`${phase} malformed link page:\n${text.slice(0, 300)}\n---`)
    assert.strictEqual(await settingsEmail(page), 'none')
    await ctx.close()
  })

  await browser.close()
  console.log(results.join('\n'))
  if (results.some((r) => r.includes('FAIL'))) process.exit(1)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
