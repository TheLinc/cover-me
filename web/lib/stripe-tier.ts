import type Stripe from 'stripe'

export type Tier = 'hosted_free' | 'hosted_pro'

const PAID_STATUSES = new Set(['active', 'trialing'])

// A free week from a /redeem link (#112): the billing function tags it.
export function isGiftTrial(sub: Pick<Stripe.Subscription, 'status' | 'metadata'>): boolean {
  return sub.status === 'trialing' && sub.metadata?.gift_trial === 'true'
}

export interface TrialState {
  /** A gift trial with no paid plan yet: it ends here, back on free. */
  giftTrialEnd: string | null
  /** A paid plan still in a trial carried over from a gift trial: first charge. */
  firstPayment: { date: string; price: string } | null
}

// What the dashboard's plan tile says about trials, from the customer's
// trialing subscriptions. A paid plan wins: the gift trial is about to be cancelled.
export function trialState(trialing: Stripe.Subscription[]): TrialState {
  const iso = (s: Stripe.Subscription) => new Date(s.trial_end! * 1000).toISOString()
  const paid = trialing.find((s) => !isGiftTrial(s) && s.trial_end)
  if (paid) return { giftTrialEnd: null, firstPayment: { date: iso(paid), price: priceLabel(paid.items.data[0].price) } }
  const gift = trialing.find((s) => isGiftTrial(s) && s.trial_end)
  return { giftTrialEnd: gift ? iso(gift) : null, firstPayment: null }
}

// Calendar days from now to the trial's end, in the reader's own time zone.
export function daysLeftLabel(endIso: string, now = new Date()): string {
  const day = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  const n = Math.round((day(new Date(endIso)) - day(now)) / 86_400_000)
  return n <= 0 ? 'ends today' : n === 1 ? '1 day left' : `${n} days left`
}

// "$15 a month", "$35 every 3 months": the dashboard's wording for the plans.
function priceLabel(price: Pick<Stripe.Price, 'unit_amount' | 'recurring'>): string {
  const cents = price.unit_amount ?? 0
  const amount = `$${cents % 100 ? (cents / 100).toFixed(2) : cents / 100}`
  const { interval = 'month', interval_count = 1 } = price.recurring ?? {}
  return interval_count === 1 ? `${amount} a ${interval}` : `${amount} every ${interval_count} ${interval}s`
}

export function tierFromStatuses(statuses: string[]): Tier {
  return statuses.some((s) => PAID_STATUSES.has(s)) ? 'hosted_pro' : 'hosted_free'
}

export interface TierDeps {
  /** Status of every subscription the customer has, read live from Stripe. */
  listStatuses(customerId: string): Promise<string[]>
  /** readAt is when the Stripe read started; the DB drops writes older than the last one. */
  setTier(customerId: string, tier: Tier, readAt: Date): Promise<{ error: string | null }>
  linkCustomer(userId: string, customerId: string): Promise<{ error: string | null }>
  /** Ends a gift trial (a no-op once it's already over). */
  cancelGiftTrial(subscriptionId: string): Promise<{ error: string | null }>
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
    // A paid upgrade from a gift trial (the billing function tags the session).
    // The paid subscription keeps the user on Pro while the trial ends.
    const giftTrial = session.metadata?.gift_trial_subscription
    if (giftTrial) {
      const { error } = await deps.cancelGiftTrial(giftTrial)
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
