import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { handleStripeEvent } from '@/lib/stripe-tier'

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  )

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const ok = await handleStripeEvent(event, {
    listStatuses: async (customer) => {
      const subs = await stripe.subscriptions.list({ customer, status: 'all', limit: 100 })
      return subs.data.map((s) => s.status)
    },
    setTier: async (customerId, tier) => {
      const { error } = await adminSupabase.from('users').update({ tier }).eq('stripe_customer_id', customerId)
      return { error: error?.message ?? null }
    },
    linkCustomer: async (userId, customerId) => {
      const { error } = await adminSupabase.from('users').update({ stripe_customer_id: customerId }).eq('id', userId)
      return { error: error?.message ?? null }
    },
  })

  if (!ok) {
    console.error('[stripe-webhook] DB update failed for event', event.id, event.type)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
  return NextResponse.json({ received: true })
}
