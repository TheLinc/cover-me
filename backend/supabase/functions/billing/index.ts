import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SECRET_KEY = Deno.env.get('SERVICE_KEY')!
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
// Pro at $15/month or $35 every 3 months (relaunch pricing, 2026-10-08).
const PRICES = {
  monthly: Deno.env.get('STRIPE_PRO_PRICE_ID')!,
  quarterly: Deno.env.get('STRIPE_PRO_QUARTERLY_PRICE_ID')!,
} as const
const SITE_URL = (Deno.env.get('SITE_URL') || 'https://www.cover-me.dev').replace(/\/+$/, '')
// Unset in production. The local test run points it at the mock server.
const STRIPE_BASE = (Deno.env.get('STRIPE_API_BASE') || 'https://api.stripe.com').replace(/\/+$/, '')

// Subscriptions that still bill (or retry) the card. Checkout on top of one
// of these would charge the customer twice.
const OPEN_STATUSES = new Set(['active', 'trialing', 'past_due', 'unpaid'])

class StripeError extends Error {
  constructor(readonly status: number, readonly code: string | undefined, path: string) {
    super(`Stripe ${path} returned ${status}${code ? ` (${code})` : ''}`)
  }
}

async function stripe(
  path: string,
  params: Record<string, string>,
  opts: { method?: 'GET' | 'POST'; idempotencyKey?: string } = {},
) {
  const method = opts.method ?? 'POST'
  const headers: Record<string, string> = { Authorization: `Bearer ${STRIPE_SECRET_KEY}` }
  let url = `${STRIPE_BASE}/v1/${path}`
  let body: URLSearchParams | undefined
  if (method === 'GET') {
    url += `?${new URLSearchParams(params)}`
  } else {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    body = new URLSearchParams(params)
  }
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey
  const res = await fetch(url, { method, headers, body })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new StripeError(res.status, data?.error?.code, path)
  return data
}

// Checkout and billing portal for the extension and the web dashboard. Both
// send the user's Supabase token, so upgrading never needs a website sign-in.
Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return json({ error: 'Unauthorized' }, 401)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return json({ error: 'Invalid token' }, 401)

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const { action, plan = 'monthly' } = await req.json().catch(() => ({})) as { action?: string; plan?: string }
  if (action !== 'checkout' && action !== 'portal') return json({ error: 'Unknown action' }, 400)
  if (plan !== 'monthly' && plan !== 'quarterly') return json({ error: 'Unknown plan' }, 400)

  const { data: row } = await supabase
    .from('users')
    .select('tier, stripe_customer_id')
    .eq('id', user.id)
    .single()
  let customerId = (row?.stripe_customer_id as string | null) ?? null

  try {
    if (action === 'portal') {
      if (!customerId) return json({ error: 'No billing account yet.' }, 400)
      const portal = await stripe('billing_portal/sessions', { customer: customerId, return_url: `${SITE_URL}/dashboard` })
      return json({ url: portal.url })
    }

    if (row?.tier === 'hosted_pro') return json({ error: 'You are already on Pro.' }, 409)

    // The tier can read free while a past_due subscription still retries the
    // card, so ask Stripe. A customer deleted in Stripe gets replaced.
    let replaced = false
    if (customerId) {
      try {
        const subs = await stripe('subscriptions', { customer: customerId, status: 'all', limit: '20' }, { method: 'GET' })
        if ((subs.data as Array<{ status: string }>).some((s) => OPEN_STATUSES.has(s.status))) {
          return json({ error: 'You already have a subscription. Update your payment method from the dashboard.' }, 409)
        }
      } catch (err) {
        if (!(err instanceof StripeError && err.code === 'resource_missing')) throw err
        customerId = null
        replaced = true
      }
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

    const session = await stripe('checkout/sessions', {
      mode: 'subscription',
      customer: customerId,
      'line_items[0][price]': PRICES[plan],
      'line_items[0][quantity]': '1',
      'metadata[supabase_user_id]': user.id,
      success_url: `${SITE_URL}/upgraded`,
      cancel_url: `${SITE_URL}/dashboard`,
    })
    return json({ url: session.url })
  } catch (err) {
    console.error('[billing]', err instanceof Error ? err.message : 'unknown error')
    return json({ error: 'Could not reach billing. Please try again.' }, 502)
  }
})
