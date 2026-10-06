import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SECRET_KEY = Deno.env.get('SERVICE_KEY')!
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const PRICE_ID = Deno.env.get('STRIPE_PRO_PRICE_ID')!
const SITE_URL = (Deno.env.get('SITE_URL') || 'https://www.cover-me.dev').replace(/\/+$/, '')
// Unset in production. The local test run points it at the mock server.
const STRIPE_BASE = (Deno.env.get('STRIPE_API_BASE') || 'https://api.stripe.com').replace(/\/+$/, '')

async function stripe(path: string, params: Record<string, string>, idempotencyKey?: string) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  }
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey
  const res = await fetch(`${STRIPE_BASE}/v1/${path}`, { method: 'POST', headers, body: new URLSearchParams(params) })
  if (!res.ok) throw new Error(`Stripe ${path} returned ${res.status}`)
  return await res.json()
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

  const { action } = await req.json().catch(() => ({})) as { action?: string }
  if (action !== 'checkout' && action !== 'portal') return json({ error: 'Unknown action' }, 400)

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

    if (!customerId) {
      // The idempotency key makes a double click return the same customer.
      const customer = await stripe(
        'customers',
        { email: user.email ?? '', 'metadata[supabase_user_id]': user.id },
        `customer-${user.id}`,
      )
      customerId = customer.id as string
      const { error } = await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id)
      if (error) return json({ error: 'Could not start checkout. Please try again.' }, 500)
    }

    const session = await stripe('checkout/sessions', {
      mode: 'subscription',
      customer: customerId,
      'line_items[0][price]': PRICE_ID,
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
