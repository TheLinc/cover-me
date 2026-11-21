// Proof for #312: Settings' Plan section on master vs this branch.
// node proof.mjs <base url> <before|after|nokey>
// Users come from seed.mjs (users.json). Fails if a version doesn't show what it should.
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const [base, label] = process.argv.slice(2)
const { password, users } = JSON.parse(readFileSync(new URL('./users.json', import.meta.url), 'utf8'))

// Dates as a reader in Toronto sees them, for subscriptions seeded on 2026-11-21.
const AFTER = {
  gift: ['Pro', 'Trial · 4 days left', 'Free for a week, from a gift link.', 'Ends November 25', "Then you're back on the free plan."],
  firstpay: ['Pro', 'Trial', '$15 a month', 'First payment November 25', 'Nothing is charged before then.'],
  monthly: ['Pro', 'Active', '$15 a month', 'Renews December 21', 'Cancel any time before then.'],
  quarterly: ['Pro', 'Active', '$35 every 3 months', 'Renews February 21', 'Cancel any time before then.'],
  cancelled: ['Pro', 'Ending', "You won't be charged again.", 'Ends December 21', "Then you're back on the free plan."],
}
const DASHBOARD = {
  gift: "Ends November 25, then you're back on the free plan.",
  firstpay: 'First payment November 25: $15 a month.',
}

const browser = await chromium.launch()
const failures = []
for (const [i, [state, { email }]] of Object.entries(users).entries()) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'America/Toronto', colorScheme: 'light' })
  const page = await ctx.newPage()
  await page.goto(`${base}/auth`)
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.locator('form button[type=submit]').first().click()
  await page.waitForURL('**/dashboard', { timeout: 60_000 })

  if (DASHBOARD[state] && label !== 'nokey') {
    await page.getByText(DASHBOARD[state]).waitFor({ timeout: 30_000 }).catch(() => failures.push(`${state}: dashboard tile lost "${DASHBOARD[state]}"`))
  }

  await page.goto(`${base}/dashboard/settings`)
  const plan = page.locator('section[aria-labelledby="settings-plan"]')
  await plan.getByRole('button', { name: /Manage billing/ }).waitFor({ timeout: 60_000 })
  await page.waitForTimeout(800) // LocalDate and DaysLeft switch to the reader's zone after hydration
  await plan.screenshot({ path: new URL(`./${label}-${i + 1}-${state}.png`, import.meta.url).pathname.slice(1) })
  const text = (await plan.innerText()).replace(/\s+/g, ' ')
  if (label === 'after' && state === 'gift') {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(300)
    await plan.screenshot({ path: new URL(`./${label}-mobile-${state}.png`, import.meta.url).pathname.slice(1) })
  }

  try {
    if (label === 'after') for (const line of AFTER[state]) assert.ok(text.includes(line), `${state}: missing "${line}" in "${text}"`)
    else assert.match(text, /^Plan Pro Manage billing$/, `${state}: expected only the badge and Manage billing, got "${text}"`)
  } catch (e) {
    failures.push(e.message)
  }
  await ctx.close()
}
await browser.close()
if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}
console.log(`${label}: all ${Object.keys(users).length} states as expected`)
