import { describe, expect, it } from 'vitest'
import type Stripe from 'stripe'
import { handleStripeEvent, tierFromStatuses, type Tier, type TierDeps } from './stripe-tier'

function fakeDeps(statuses: string[], opts: { failSetTier?: boolean } = {}) {
  const calls = { setTier: [] as Array<[string, Tier]>, linkCustomer: [] as Array<[string, string]> }
  const deps: TierDeps = {
    listStatuses: async () => statuses,
    setTier: async (customerId, tier) => {
      calls.setTier.push([customerId, tier])
      return { error: opts.failSetTier ? 'db down' : null }
    },
    linkCustomer: async (userId, customerId) => {
      calls.linkCustomer.push([userId, customerId])
      return { error: null }
    },
  }
  return { calls, deps }
}

const event = (type: string, object: object) => ({ type, data: { object } }) as unknown as Stripe.Event

describe('tierFromStatuses', () => {
  it('is Pro when any subscription is active or trialing', () => {
    expect(tierFromStatuses(['canceled', 'active'])).toBe('hosted_pro')
    expect(tierFromStatuses(['trialing'])).toBe('hosted_pro')
  })

  it('is free when nothing is active', () => {
    expect(tierFromStatuses([])).toBe('hosted_free')
    expect(tierFromStatuses(['past_due', 'canceled', 'incomplete', 'unpaid', 'paused'])).toBe('hosted_free')
  })
})

describe('handleStripeEvent', () => {
  it("uses Stripe's current state, not the stale event payload", async () => {
    const { calls, deps } = fakeDeps(['active'])
    const ok = await handleStripeEvent(event('customer.subscription.updated', { customer: 'cus_1', status: 'past_due' }), deps)
    expect(ok).toBe(true)
    expect(calls.setTier).toEqual([['cus_1', 'hosted_pro']])
  })

  it('downgrades when the last subscription is deleted', async () => {
    const { calls, deps } = fakeDeps(['canceled'])
    await handleStripeEvent(event('customer.subscription.deleted', { customer: 'cus_1' }), deps)
    expect(calls.setTier).toEqual([['cus_1', 'hosted_free']])
  })

  it('links the customer to the user on checkout, then sets the tier', async () => {
    const { calls, deps } = fakeDeps(['active'])
    await handleStripeEvent(
      event('checkout.session.completed', { customer: 'cus_2', metadata: { supabase_user_id: 'user-1' } }),
      deps,
    )
    expect(calls.linkCustomer).toEqual([['user-1', 'cus_2']])
    expect(calls.setTier).toEqual([['cus_2', 'hosted_pro']])
  })

  it('reports failure when the DB write fails, so Stripe retries', async () => {
    const { deps } = fakeDeps(['active'], { failSetTier: true })
    expect(await handleStripeEvent(event('customer.subscription.created', { customer: 'cus_1' }), deps)).toBe(false)
  })

  it('ignores unrelated events', async () => {
    const { calls, deps } = fakeDeps(['active'])
    expect(await handleStripeEvent(event('invoice.paid', { customer: 'cus_1' }), deps)).toBe(true)
    expect(calls.setTier).toEqual([])
  })
})
