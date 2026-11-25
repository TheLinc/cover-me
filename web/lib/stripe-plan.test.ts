import { afterEach, describe, expect, it, vi } from 'vitest'
import { readPlan } from './stripe-plan'

describe('readPlan', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('falls back to the plain Pro plan when Stripe cannot be read', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '')
    expect(await readPlan('cus_1')).toEqual({ giftTrialEnd: null, firstPayment: null, renews: null, endsAt: null })
  })
})
