import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/cors.ts'
import { stripe, StripeError } from '../_shared/stripe.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SECRET_KEY = Deno.env.get('SERVICE_KEY')!
// Pro at $15/month or $35 every 3 months (relaunch pricing, 2026-10-08).
const PRICES = {
  monthly: Deno.env.get('STRIPE_PRO_PRICE_ID')!,
  quarterly: Deno.env.get('STRIPE_PRO_QUARTERLY_PRICE_ID')!,
} as const
const SITE_URL = (Deno.env.get('SITE_URL') || 'https://www.cover-me.dev').replace(/\/+$/, '')

// Subscriptions that still bill (or retry) the card. Checkout on top of one
// of these would charge the customer twice.
const OPEN_STATUSES = new Set(['active', 'trialing', 'past_due', 'unpaid'])

type Subscription = { id: string; status: string; trial_end: number | null; metadata?: Record<string, string> }

// A free week of Pro from a /redeem link: no card, and Stripe cancels it when
// the week ends. Upgrading from one is the only checkout an open subscription allows.
const GIFT_TRIAL_DAYS = '7'
const isGiftTrial = (s: Subscription) => s.status === 'trialing' && s.metadata?.gift_trial === 'true'
// Checkout's subscription_data.trial_end must be at least 48 hours away. A
// minute of slack for the time between this check and Stripe's.
const MIN_TRIAL_CARRYOVER_S = 2 * 86_400 + 60

const CODE_ERRORS = {
  unknown: { status: 404, error: "This link isn't valid. Check that you copied all of it." },
  used: { status: 409, error: 'This link has already been used.' },
  expired: { status: 410, error: 'This link has expired.' },
  accountUsed: { status: 409, error: 'This account has already used a free trial.' },
}

type Db = ReturnType<typeof createClient>

// Marks the code used by this account in one statement, so two people can't
// both claim it. The unique redeemed_by stops a second trial on one account.
async function claimCode(supabase: Db, code: unknown, userId: string): Promise<{ note: string | null } | { status: number; error: string }> {
  if (typeof code !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(code)) return CODE_ERRORS.unknown
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('trial_codes')
    .update({ redeemed_by: userId, redeemed_at: now })
    .eq('code', code)
    .is('redeemed_at', null)
    .gt('expires_at', now)
    .select('note')
    .maybeSingle()
  if (error?.code === '23505') return CODE_ERRORS.accountUsed
  if (error) throw new Error(`claim failed: ${error.message}`)
  if (data) return { note: data.note as string | null }

  const { data: found } = await supabase.from('trial_codes').select('redeemed_at').eq('code', code).maybeSingle()
  return !found ? CODE_ERRORS.unknown : found.redeemed_at ? CODE_ERRORS.used : CODE_ERRORS.expired
}

// Checkout, billing portal and gift trial redemption for the extension and the
// web dashboard. All send the user's Supabase token, so upgrading never needs
// a website sign-in.
Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return json({ error: 'Unauthorized' }, 401)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return json({ error: 'Invalid token' }, 401)

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const { action, plan = 'monthly', code } = await req.json().catch(() => ({})) as { action?: string; plan?: string; code?: unknown }
  if (action !== 'checkout' && action !== 'portal' && action !== 'redeem') return json({ error: 'Unknown action' }, 400)
  if (plan !== 'monthly' && plan !== 'quarterly') return json({ error: 'Unknown plan' }, 400)

  const { data: row } = await supabase
    .from('users')
    .select('tier, stripe_customer_id')
    .eq('id', user.id)
    .single()
  let customerId = (row?.stripe_customer_id as string | null) ?? null
  // A gift trial is always on the monthly price.
  const price = action === 'redeem' ? 'monthly' : plan
  // A claimed code goes back if the trial doesn't start (see finally).
  let claimed = false
  let trialStarted = false
  let note: string | null = null

  try {
    if (action === 'portal') {
      if (!customerId) return json({ error: 'No billing account yet.' }, 400)
      const portal = await stripe('billing_portal/sessions', { customer: customerId, return_url: `${SITE_URL}/dashboard` })
      return json({ url: portal.url })
    }

    const isPro = row?.tier === 'hosted_pro'
    if (isPro && action === 'redeem') return json({ error: 'You are already on Pro.' }, 409)

    // A price secret that isn't set would reach Stripe as the string
    // "undefined" and come back as an opaque 502. Say which one, before any
    // customer is created.
    if (!PRICES[price]) {
      console.error(`[billing] ${price === 'monthly' ? 'STRIPE_PRO_PRICE_ID' : 'STRIPE_PRO_QUARTERLY_PRICE_ID'} is not set`)
      return json({ error: price === 'quarterly'
        ? "Quarterly billing isn't available yet. Choose monthly, or try again later."
        : "Billing isn't available right now. Please try again later." }, 503)
    }

    // The tier can read free while a past_due subscription still retries the
    // card, so ask Stripe. A customer deleted in Stripe gets replaced.
    let replaced = false
    let giftTrial: Subscription | undefined
    if (customerId) {
      try {
        const subs = (await stripe('subscriptions', { customer: customerId, status: 'all', limit: '20' }, { method: 'GET' })).data as Subscription[]
        const open = subs.filter((s) => OPEN_STATUSES.has(s.status))
        if (action === 'checkout') giftTrial = open.find(isGiftTrial)
        if (open.some((s) => s !== giftTrial)) {
          return json({ error: isPro
            ? 'You are already on Pro.'
            : 'You already have a subscription. Update your payment method from the dashboard.' }, 409)
        }
      } catch (err) {
        if (!(err instanceof StripeError && err.code === 'resource_missing')) throw err
        customerId = null
        replaced = true
      }
    }
    // Pro with nothing open in Stripe (set by hand, say): nothing to upgrade from.
    if (isPro && !giftTrial) return json({ error: 'You are already on Pro.' }, 409)

    // Claimed before any Stripe write, so a bad code changes nothing there.
    if (action === 'redeem') {
      const result = await claimCode(supabase, code, user.id)
      if ('error' in result) return json({ error: result.error }, result.status)
      claimed = true
      note = result.note
    }

    if (!customerId) {
      // The idempotency key makes a double click return the same customer. A
      // replacement needs a fresh key: Stripe replays the old one for 24 hours.
      const createCustomer = (key: string) =>
        stripe('customers', { email: user.email ?? '', 'metadata[supabase_user_id]': user.id }, { idempotencyKey: key })
      const freshKey = () => `customer-${user.id}-${Date.now()}`

      let customer
      try {
        customer = await createCustomer(replaced ? freshKey() : `customer-${user.id}`)
      } catch (err) {
        if (!(err instanceof StripeError)) throw err
        // A second tab is creating the customer with the same key right now.
        if (err.code === 'idempotency_key_in_use') {
          return json({ error: 'Checkout is already opening. Try again in a moment.' }, 409)
        }
        // Same key, different details (for example a changed email): new key.
        if (err.code !== 'idempotency_error') throw err
        customer = await createCustomer(freshKey())
      }
      customerId = customer.id as string
      const { error } = await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id)
      if (error) return json({ error: 'Could not start checkout. Please try again.' }, 500)
    }

    if (action === 'redeem') {
      // Plain trial_period_days, not Stripe's newer trial offers: those need a
      // separate offer object for the same cancel-at-the-end behaviour.
      // missing_payment_method=cancel ends a cardless trial; cancel_at_period_end
      // ends one whose customer kept a card from an old subscription, which
      // Stripe would otherwise charge. The key holds the user too: a released
      // code can go to someone else.
      const sub = await stripe('subscriptions', {
        customer: customerId,
        'items[0][price]': PRICES.monthly,
        trial_period_days: GIFT_TRIAL_DAYS,
        'trial_settings[end_behavior][missing_payment_method]': 'cancel',
        cancel_at_period_end: 'true',
        'metadata[gift_trial]': 'true',
        'metadata[supabase_user_id]': user.id,
      }, { idempotencyKey: `gift-trial-${code}-${user.id}` })
      trialStarted = true
      // The webhook sets the tier from the new subscription.
      return json({ trialEnd: new Date(sub.trial_end * 1000).toISOString(), note })
    }

    // Upgrading from a gift trial: billing starts when the trial would have
    // ended, if Stripe allows it, and the webhook cancels the trial once paid.
    const carryTrial = giftTrial?.trial_end && giftTrial.trial_end - Date.now() / 1000 >= MIN_TRIAL_CARRYOVER_S
    const session = await stripe('checkout/sessions', {
      mode: 'subscription',
      customer: customerId,
      'line_items[0][price]': PRICES[price],
      'line_items[0][quantity]': '1',
      'metadata[supabase_user_id]': user.id,
      ...(giftTrial && { 'metadata[gift_trial_subscription]': giftTrial.id }),
      ...(carryTrial && { 'subscription_data[trial_end]': String(giftTrial!.trial_end) }),
      // Nothing is charged today on a carried-over trial: the page names the first payment.
      success_url: carryTrial ? `${SITE_URL}/upgraded?first=${giftTrial!.trial_end}` : `${SITE_URL}/upgraded`,
      cancel_url: `${SITE_URL}/dashboard`,
    })
    return json({ url: session.url })
  } catch (err) {
    console.error('[billing]', err instanceof Error ? err.message : 'unknown error')
    return json({ error: 'Could not reach billing. Please try again.' }, 502)
  } finally {
    // ponytail: a timeout after Stripe did create the trial also releases the
    // code (one stray free week at worst); keep the claim on unclear errors if
    // that ever matters.
    if (claimed && !trialStarted) {
      await supabase.from('trial_codes').update({ redeemed_by: null, redeemed_at: null }).eq('code', code).eq('redeemed_by', user.id)
    }
  }
})
