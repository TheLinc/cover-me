import type Stripe from 'stripe'

export type Tier = 'hosted_free' | 'hosted_pro'

const PAID_STATUSES = new Set(['active', 'trialing'])

export function tierFromStatuses(statuses: string[]): Tier {
  return statuses.some((s) => PAID_STATUSES.has(s)) ? 'hosted_pro' : 'hosted_free'
}

export interface TierDeps {
  /** Status of every subscription the customer has, read live from Stripe. */
  listStatuses(customerId: string): Promise<string[]>
  /** readAt is when the Stripe read started; the DB drops writes older than the last one. */
  setTier(customerId: string, tier: Tier, readAt: Date): Promise<{ error: string | null }>
  linkCustomer(userId: string, customerId: string): Promise<{ error: string | null }>
}

// Reads the customer's subscriptions from Stripe instead of trusting the event
// body, so duplicate or out-of-order events all land on the same tier.
// Returns false when a DB write failed; the route answers 500 and Stripe retries.
export async function handleStripeEvent(event: Stripe.Event, deps: TierDeps): Promise<boolean> {
  let customerId: string | undefined

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    customerId = (session.customer as string | null) ?? undefined
    const userId = session.metadata?.supabase_user_id
    if (userId && customerId) {
      const { error } = await deps.linkCustomer(userId, customerId)
      if (error) return false
    }
  } else if (event.type.startsWith('customer.subscription.')) {
    customerId = (event.data.object as Stripe.Subscription).customer as string
  } else {
    return true
  }

  if (!customerId) return true
  const readAt = new Date()
  const tier = tierFromStatuses(await deps.listStatuses(customerId))
  const { error } = await deps.setTier(customerId, tier, readAt)
  return !error
}
