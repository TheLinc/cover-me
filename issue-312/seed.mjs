// Seeds made-up Pro users on the local Supabase stack, each linked to a Stripe
// sandbox customer in one plan state (#312). Run with the web env files:
// node --env-file=web/.env.local --env-file=web/.env.localdb seed.mjs <web dir>
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const webDir = process.argv[2]
const Stripe = createRequire(join(webDir, 'package.json'))('stripe')
const key = process.env.STRIPE_SECRET_KEY
if (!key?.startsWith('sk_test_')) throw new Error('needs a test-mode Stripe key')
const stripe = new Stripe(key)
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const SVC = process.env.SUPABASE_SERVICE_KEY
if (!SB.startsWith('http://127.0.0.1')) throw new Error('needs the local Supabase stack')
const MONTHLY = process.env.STRIPE_PRO_PRICE_ID
const QUARTERLY = process.env.STRIPE_PRO_QUARTERLY_PRICE_ID
const PASSWORD = 'proof-312-Passw0rd!'
const DAY = 86_400
const now = Math.floor(Date.now() / 1000)
const trialEnd = now + 4 * DAY + 6 * 3600

const sb = (path, init = {}) =>
  fetch(`${SB}${path}`, { ...init, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...init.headers } })

async function user(email) {
  const res = await sb('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }) })
  if (res.ok) return (await res.json()).id
  const list = await (await sb('/auth/v1/admin/users?per_page=1000')).json()
  return list.users.find((u) => u.email === email).id
}

async function customer(email, withCard) {
  const c = await stripe.customers.create({ email, name: 'Proof 312', metadata: { proof: '312' } })
  if (withCard) {
    const pm = await stripe.paymentMethods.attach('pm_card_visa', { customer: c.id })
    await stripe.customers.update(c.id, { invoice_settings: { default_payment_method: pm.id } })
  }
  return c.id
}

const STATES = {
  gift: async (cus) =>
    stripe.subscriptions.create({
      customer: cus, items: [{ price: MONTHLY }], trial_end: trialEnd, cancel_at_period_end: true,
      trial_settings: { end_behavior: { missing_payment_method: 'cancel' } }, metadata: { gift_trial: 'true' },
    }),
  firstpay: async (cus) => stripe.subscriptions.create({ customer: cus, items: [{ price: MONTHLY }], trial_end: trialEnd }),
  monthly: async (cus) => stripe.subscriptions.create({ customer: cus, items: [{ price: MONTHLY }] }),
  quarterly: async (cus) => stripe.subscriptions.create({ customer: cus, items: [{ price: QUARTERLY }] }),
  cancelled: async (cus) => {
    const s = await stripe.subscriptions.create({ customer: cus, items: [{ price: MONTHLY }] })
    return stripe.subscriptions.update(s.id, { cancel_at_period_end: true })
  },
}

const out = {}
for (const [state, makeSub] of Object.entries(STATES)) {
  const email = `proof312-${state}@example.com`
  const id = await user(email)
  const cus = await customer(email, !['gift', 'firstpay'].includes(state))
  const sub = await makeSub(cus)
  const res = await sb(`/rest/v1/users?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ tier: 'hosted_pro', stripe_customer_id: cus }) })
  if (!res.ok) throw new Error(`users update ${res.status} ${await res.text()}`)
  out[state] = { email, customer: cus, status: sub.status, periodEnd: new Date(sub.current_period_end * 1000).toISOString(), cancelAt: sub.cancel_at }
}
writeFileSync(new URL('./users.json', import.meta.url), JSON.stringify({ password: PASSWORD, users: out }, null, 2))
console.log(JSON.stringify(out, null, 2))
