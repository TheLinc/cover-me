import Stripe from 'stripe'
import { NO_PLAN, planState, type PlanState } from './stripe-tier'

// A slow or failed Stripe read shows the plain Pro plan instead (#112, #312).
export async function readPlan(customer: string | null): Promise<PlanState> {
  if (!customer) return NO_PLAN
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { timeout: 3000, maxNetworkRetries: 0 })
    return planState((await stripe.subscriptions.list({ customer, limit: 10 })).data)
  } catch {
    return NO_PLAN
  }
}
