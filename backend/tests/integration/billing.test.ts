import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { admin, callFunction, createUser, deleteUser, JOB, mockClaude, mockStripe, setUsage, type TestUser, uploadResume } from './helpers'

describe('billing', () => {
  let user: TestUser | undefined

  beforeEach(async () => {
    await mockClaude.reset()
  })

  afterEach(async () => {
    await deleteUser(user)
    user = undefined
  })

  it('rejects requests without a token', async () => {
    const res = await callFunction('billing', { body: { action: 'checkout' } })
    expect(res.status).toBe(401)
  })

  it('rejects unknown actions', async () => {
    user = await createUser()
    const res = await callFunction('billing', { token: user.token, body: { action: 'refund' } })
    expect(res.status).toBe(400)
  })

  it('creates a customer once and returns a checkout URL', async () => {
    user = await createUser()
    const res = await callFunction('billing', { token: user.token, body: { action: 'checkout' } })
    expect(res.status).toBe(200)
    expect((await res.json()).url).toMatch(/^https:\/\/checkout\.stripe\.test\//)

    const { data } = await admin.from('users').select('stripe_customer_id').eq('id', user.id).single()
    expect(data?.stripe_customer_id).toMatch(/^cus_mock_/)

    const calls = await mockStripe.calls()
    const customer = calls.find((c) => c.path === '/v1/customers')
    expect(customer?.idempotencyKey).toBe(`customer-${user.id}`)
    const checkout = calls.find((c) => c.path === '/v1/checkout/sessions')
    expect(checkout?.params.customer).toBe(data?.stripe_customer_id)
    expect(checkout?.params['line_items[0][price]']).toBe('price_mock_pro')
    expect(checkout?.params.success_url).toBe('http://localhost:3000/upgraded')
  })

  it('reuses the Stripe customer on a second checkout', async () => {
    user = await createUser()
    await callFunction('billing', { token: user.token, body: { action: 'checkout' } })
    await callFunction('billing', { token: user.token, body: { action: 'checkout' } })
    const customers = (await mockStripe.calls()).filter((c) => c.path === '/v1/customers')
    expect(customers).toHaveLength(1)
  })

  it('refuses checkout for users already on Pro', async () => {
    user = await createUser('hosted_pro')
    const res = await callFunction('billing', { token: user.token, body: { action: 'checkout' } })
    expect(res.status).toBe(409)
  })

  it('refuses checkout while an earlier subscription is still past due', async () => {
    user = await createUser()
    await admin.from('users').update({ stripe_customer_id: 'cus_existing' }).eq('id', user.id)
    await mockStripe.setState({ subscriptions: ['canceled', 'past_due'] })

    const res = await callFunction('billing', { token: user.token, body: { action: 'checkout' } })
    expect(res.status).toBe(409)
    const checkouts = (await mockStripe.calls()).filter((c) => c.path === '/v1/checkout/sessions')
    expect(checkouts).toHaveLength(0)
  })

  it('replaces a Stripe customer that no longer exists', async () => {
    user = await createUser()
    await admin.from('users').update({ stripe_customer_id: 'cus_gone' }).eq('id', user.id)
    await mockStripe.setState({ missingCustomer: true })

    const res = await callFunction('billing', { token: user.token, body: { action: 'checkout' } })
    expect(res.status).toBe(200)

    const { data } = await admin.from('users').select('stripe_customer_id').eq('id', user.id).single()
    expect(data?.stripe_customer_id).toMatch(/^cus_mock_/)
    const customer = (await mockStripe.calls()).find((c) => c.path === '/v1/customers')
    // A fresh key: Stripe would replay the old customer for the original key.
    expect(customer?.idempotencyKey).not.toBe(`customer-${user.id}`)
    expect(customer?.idempotencyKey?.startsWith(`customer-${user.id}-`)).toBe(true)
  })

  it('asks the user to wait when the same checkout is already starting', async () => {
    user = await createUser()
    await mockStripe.setState({ customerError: { status: 409, code: 'idempotency_key_in_use' } })

    const res = await callFunction('billing', { token: user.token, body: { action: 'checkout' } })
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/already/i)
  })

  it('retries with a fresh key when Stripe rejects a reused one', async () => {
    user = await createUser()
    await mockStripe.setState({ customerError: { status: 400, code: 'idempotency_error' } })

    const res = await callFunction('billing', { token: user.token, body: { action: 'checkout' } })
    expect(res.status).toBe(200)
    const customers = (await mockStripe.calls()).filter((c) => c.path === '/v1/customers')
    expect(customers).toHaveLength(2)
    expect(customers[1].idempotencyKey?.startsWith(`customer-${user.id}-`)).toBe(true)
  })

  it('returns a portal URL only when the user has a Stripe customer', async () => {
    user = await createUser()
    const before = await callFunction('billing', { token: user.token, body: { action: 'portal' } })
    expect(before.status).toBe(400)

    await admin.from('users').update({ stripe_customer_id: 'cus_existing' }).eq('id', user.id)
    const after = await callFunction('billing', { token: user.token, body: { action: 'portal' } })
    expect(after.status).toBe(200)
    expect((await after.json()).url).toBe('https://billing.stripe.test/portal')
    const portal = (await mockStripe.calls()).find((c) => c.path === '/v1/billing_portal/sessions')
    expect(portal?.params.customer).toBe('cus_existing')
  })

  it('checks out the quarterly price when asked', async () => {
    user = await createUser()
    const res = await callFunction('billing', { token: user.token, body: { action: 'checkout', plan: 'quarterly' } })
    expect(res.status).toBe(200)
    const checkout = (await mockStripe.calls()).find((c) => c.path === '/v1/checkout/sessions')
    expect(checkout?.params['line_items[0][price]']).toBe('price_mock_pro_quarterly')
  })

  describe('checkout during a gift trial', () => {
    const DAY = 86_400
    const now = () => Math.floor(Date.now() / 1000)
    const giftTrial = (trialEnd: number) => ({ id: 'sub_gift', status: 'trialing', trial_end: trialEnd, metadata: { gift_trial: 'true' } })

    it('starts billing when the trial would have ended, and tags the session to end the trial', async () => {
      user = await createUser('hosted_pro')
      await admin.from('users').update({ stripe_customer_id: 'cus_trial' }).eq('id', user.id)
      const trialEnd = now() + 5 * DAY
      await mockStripe.setState({ subscriptions: ['canceled', giftTrial(trialEnd)] })

      const res = await callFunction('billing', { token: user.token, body: { action: 'checkout', plan: 'quarterly' } })
      expect(res.status).toBe(200)
      const checkout = (await mockStripe.calls()).find((c) => c.path === '/v1/checkout/sessions')
      expect(checkout?.params['subscription_data[trial_end]']).toBe(String(trialEnd))
      expect(checkout?.params['metadata[gift_trial_subscription]']).toBe('sub_gift')
      // Nothing is charged today, so the success page names the first payment instead.
      expect(checkout?.params.success_url).toBe(`http://localhost:3000/upgraded?first=${trialEnd}`)
    })

    it('starts billing now when less than two trial days remain', async () => {
      user = await createUser('hosted_pro')
      await admin.from('users').update({ stripe_customer_id: 'cus_trial' }).eq('id', user.id)
      await mockStripe.setState({ subscriptions: [giftTrial(now() + DAY)] })

      const res = await callFunction('billing', { token: user.token, body: { action: 'checkout' } })
      expect(res.status).toBe(200)
      const checkout = (await mockStripe.calls()).find((c) => c.path === '/v1/checkout/sessions')
      expect(checkout?.params['subscription_data[trial_end]']).toBeUndefined()
      expect(checkout?.params['metadata[gift_trial_subscription]']).toBe('sub_gift')
      expect(checkout?.params.success_url).toBe('http://localhost:3000/upgraded')
    })

    it('still refuses a Pro user whose subscription is a paid one', async () => {
      user = await createUser('hosted_pro')
      await admin.from('users').update({ stripe_customer_id: 'cus_paid' }).eq('id', user.id)
      await mockStripe.setState({ subscriptions: ['active'] })

      const res = await callFunction('billing', { token: user.token, body: { action: 'checkout' } })
      expect(res.status).toBe(409)
      expect((await mockStripe.calls()).some((c) => c.path === '/v1/checkout/sessions')).toBe(false)
    })
  })

  // The first-month offer (#213). Unset, checkout sends what it always did.
  describe('first-month offer', () => {
    const COUPON = process.env.STRIPE_FIRST_MONTH_COUPON_ID || undefined
    const offerOpen = (userId: string) =>
      admin.from('users').update({ first_month_offer_at: new Date(Date.now() - 3_600_000).toISOString() }).eq('id', userId)
    const checkout = async (plan = 'monthly') => {
      const res = await callFunction('billing', { token: user!.token, body: { action: 'checkout', plan } })
      expect(res.status).toBe(200)
      return (await mockStripe.calls()).find((c) => c.path === '/v1/checkout/sessions')!.params
    }

    it('takes the coupon off a monthly checkout while the offer is open', async () => {
      user = await createUser()
      await offerOpen(user.id)
      expect((await checkout())['discounts[0][coupon]']).toBe(COUPON)
    })

    it('never discounts quarterly', async () => {
      user = await createUser()
      await offerOpen(user.id)
      expect((await checkout('quarterly'))['discounts[0][coupon]']).toBeUndefined()
    })

    it('charges full price on the day checkout first opens, and starts the offer a day out', async () => {
      user = await createUser()
      expect((await checkout())['discounts[0][coupon]']).toBeUndefined()
      const { data } = await admin.from('users').select('first_month_offer_at').eq('id', user.id).single()
      if (!COUPON) return expect(data?.first_month_offer_at).toBeNull()
      const wait = Date.parse(data!.first_month_offer_at as string) - Date.now()
      expect(wait).toBeGreaterThan(23 * 3_600_000)
      expect(wait).toBeLessThanOrEqual(24 * 3_600_000)
    })

    it('charges full price on the day the weekly limit refuses a generation', async () => {
      user = await createUser()
      await uploadResume(user)
      await setUsage(user.id, [{ daysAgo: 40, count: 10 }, { daysAgo: 0, count: 5 }])
      const refused = await callFunction('generate', { token: user.token, body: { job: JOB } })
      expect(refused.status).toBe(429)
      await refused.text()
      expect((await checkout())['discounts[0][coupon]']).toBeUndefined()
    })

    it('falls back to full price when Stripe rejects the coupon', async () => {
      user = await createUser()
      await offerOpen(user.id)
      await mockStripe.setState({ discountError: { status: 400, code: 'resource_missing' } })
      const res = await callFunction('billing', { token: user.token, body: { action: 'checkout' } })
      expect(res.status).toBe(200)
      const sessions = (await mockStripe.calls()).filter((c) => c.path === '/v1/checkout/sessions')
      expect(sessions).toHaveLength(COUPON ? 2 : 1)
      expect(sessions.at(-1)!.params['discounts[0][coupon]']).toBeUndefined()
    })

    it('leaves it off for a customer Stripe says had a subscription', async () => {
      user = await createUser()
      await offerOpen(user.id)
      await admin.from('users').update({ stripe_customer_id: 'cus_lapsed' }).eq('id', user.id)
      await mockStripe.setState({ subscriptions: ['canceled'] })
      expect((await checkout())['discounts[0][coupon]']).toBeUndefined()
    })

    it("returns the open offer's end and the coupon's name for the dashboard", async () => {
      user = await createUser()
      const before = await callFunction('billing', { token: user.token, body: { action: 'offer' } })
      expect(await before.json()).toEqual({ offer: null })

      await offerOpen(user.id)
      const res = await callFunction('billing', { token: user.token, body: { action: 'offer' } })
      expect(res.status).toBe(200)
      const { offer } = await res.json()
      if (!COUPON) return expect(offer).toBeNull()
      expect(offer.name).toBe('Mock first-month offer')
      expect(Date.parse(offer.endsAt) - Date.now()).toBeGreaterThan(6 * 86_400_000)
      expect((await mockStripe.calls()).find((c) => c.path.startsWith('/v1/coupons/'))?.path).toBe(`/v1/coupons/${COUPON}`)
    })
  })

  it('rejects an unknown plan instead of charging monthly', async () => {
    user = await createUser()
    const res = await callFunction('billing', { token: user.token, body: { action: 'checkout', plan: 'weekly' } })
    expect(res.status).toBe(400)
    expect((await mockStripe.calls()).some((c) => c.path === '/v1/checkout/sessions')).toBe(false)
  })
})

describe('billing: redeeming a gift trial', () => {
  const users: TestUser[] = []
  const codes: string[] = []

  async function newUser(tier: 'hosted_free' | 'hosted_pro' = 'hosted_free') {
    const u = await createUser(tier)
    users.push(u)
    return u
  }

  async function newCode({ expiresInDays = 30, note = 'test batch' } = {}) {
    const code = `test-${randomUUID()}`
    const expires_at = new Date(Date.now() + expiresInDays * 86_400_000).toISOString()
    const { error } = await admin.from('trial_codes').insert({ code, note, expires_at })
    if (error) throw new Error(`insert code failed: ${error.message}`)
    codes.push(code)
    return code
  }

  const redeem = (u: TestUser, code: string) => callFunction('billing', { token: u.token, body: { action: 'redeem', code } })
  const redeemedBy = async (code: string) =>
    (await admin.from('trial_codes').select('redeemed_by').eq('code', code).single()).data?.redeemed_by ?? null
  // Creates only: listing a customer's subscriptions hits the same path.
  const subscriptionCalls = async () => (await mockStripe.calls()).filter((c) => c.path === '/v1/subscriptions' && c.params['items[0][price]'])

  beforeEach(async () => {
    await mockClaude.reset()
  })

  afterEach(async () => {
    await admin.from('trial_codes').delete().in('code', codes.splice(0))
    for (const u of users.splice(0)) await deleteUser(u)
  })

  it('starts a 7-day trial with no card that cancels itself, and returns the end date and note', async () => {
    const u = await newUser()
    const code = await newCode()

    const res = await redeem(u, code)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.note).toBe('test batch')
    const days = (Date.parse(body.trialEnd) - Date.now()) / 86_400_000
    expect(days).toBeGreaterThan(6.9)
    expect(days).toBeLessThan(7.1)

    const [sub] = await subscriptionCalls()
    const { data } = await admin.from('users').select('stripe_customer_id').eq('id', u.id).single()
    expect(sub.params).toMatchObject({
      customer: data?.stripe_customer_id,
      'items[0][price]': 'price_mock_pro',
      trial_period_days: '7',
      'trial_settings[end_behavior][missing_payment_method]': 'cancel',
      // Ends with no charge even if the customer kept a card from before.
      cancel_at_period_end: 'true',
      'metadata[gift_trial]': 'true',
    })
    expect(sub.idempotencyKey).toContain(code)
    expect(await redeemedBy(code)).toBe(u.id)
  })

  it('refuses an unknown code', async () => {
    const u = await newUser()
    const res = await redeem(u, 'no-such-code')
    expect(res.status).toBe(404)
    expect(await mockStripe.calls()).toEqual([])
  })

  it('refuses a code someone else already used, and changes nothing', async () => {
    const [first, second] = [await newUser(), await newUser()]
    const code = await newCode()
    expect((await redeem(first, code)).status).toBe(200)
    await mockClaude.reset()

    const res = await redeem(second, code)
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/already been used/i)
    expect(await mockStripe.calls()).toEqual([])
    expect(await redeemedBy(code)).toBe(first.id)
  })

  it('refuses a second code on the same account', async () => {
    const u = await newUser()
    expect((await redeem(u, await newCode())).status).toBe(200)
    await mockClaude.reset()

    const second = await newCode()
    const res = await redeem(u, second)
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/already used a free trial/i)
    expect(await subscriptionCalls()).toEqual([])
    expect(await redeemedBy(second)).toBeNull()
  })

  it('refuses an expired code', async () => {
    const u = await newUser()
    const code = await newCode({ expiresInDays: -1 })
    const res = await redeem(u, code)
    expect(res.status).toBe(410)
    expect(await mockStripe.calls()).toEqual([])
    expect(await redeemedBy(code)).toBeNull()
  })

  it('refuses an account that is already Pro, leaving the code unused', async () => {
    const u = await newUser('hosted_pro')
    const code = await newCode()
    const res = await redeem(u, code)
    expect(res.status).toBe(409)
    expect(await mockStripe.calls()).toEqual([])
    expect(await redeemedBy(code)).toBeNull()
  })

  it('refuses an account with an open subscription, leaving the code unused', async () => {
    const u = await newUser()
    await admin.from('users').update({ stripe_customer_id: 'cus_existing' }).eq('id', u.id)
    await mockStripe.setState({ subscriptions: ['past_due'] })
    const code = await newCode()

    const res = await redeem(u, code)
    expect(res.status).toBe(409)
    expect(await subscriptionCalls()).toEqual([])
    expect(await redeemedBy(code)).toBeNull()
  })

  it('releases the code when Stripe fails', async () => {
    const u = await newUser()
    const code = await newCode()
    await mockStripe.setState({ subscriptionError: { status: 500, code: 'api_error' } })

    const res = await redeem(u, code)
    expect(res.status).toBe(502)
    expect(await redeemedBy(code)).toBeNull()
  })
})
