import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { admin, callFunction, createUser, deleteUser, mockClaude, mockStripe, type TestUser } from './helpers'

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
})
