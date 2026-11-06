import Stripe from 'stripe'
import { trialState, type TrialState } from '@/lib/stripe-tier'

export const NO_TRIAL: TrialState = { giftTrialEnd: null, firstPayment: null }

// A gift trial's end (#112), or the first payment of a plan bought during one,
// for server pages. A slow or failed Stripe read counts as no trial. Kept out
// of stripe-tier.ts, which client components import.
export async function readTrial(customer: string): Promise<TrialState> {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { timeout: 3000, maxNetworkRetries: 0 })
    return trialState((await stripe.subscriptions.list({ customer, status: 'trialing', limit: 10 })).data)
  } catch {
    return NO_TRIAL
  }
}
