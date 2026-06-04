import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  )

  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[stripe-webhook] Signature verification failed:', message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log('[stripe-webhook] Received event:', event.type)

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId  = session.metadata?.supabase_user_id

      console.log('[stripe-webhook] checkout.session.completed — userId:', userId, '| customerId:', session.customer)

      if (!userId) {
        console.warn('[stripe-webhook] No supabase_user_id in metadata — skipping DB update')
        break
      }

      const { error } = await adminSupabase
        .from('users')
        .update({ tier: 'hosted_pro', stripe_customer_id: session.customer as string })
        .eq('id', userId)

      if (error) {
        console.error('[stripe-webhook] DB update failed:', error.message)
      } else {
        console.log('[stripe-webhook] DB updated — user', userId, 'set to hosted_pro')
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub        = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string

      console.log('[stripe-webhook] customer.subscription.deleted — customerId:', customerId)

      const { error } = await adminSupabase
        .from('users')
        .update({ tier: 'hosted_free' })
        .eq('stripe_customer_id', customerId)

      if (error) {
        console.error('[stripe-webhook] DB update failed:', error.message)
      } else {
        console.log('[stripe-webhook] DB updated — customer', customerId, 'reverted to hosted_free')
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub        = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string
      // Revoke Pro access if the subscription is no longer active.
      // past_due = payment failed, unpaid = retries exhausted, paused = manually paused.
      const inactive = ['past_due', 'unpaid', 'paused', 'canceled'].includes(sub.status)

      console.log('[stripe-webhook] customer.subscription.updated — customerId:', customerId, '| status:', sub.status)

      if (inactive) {
        const { error } = await adminSupabase
          .from('users')
          .update({ tier: 'hosted_free' })
          .eq('stripe_customer_id', customerId)

        if (error) {
          console.error('[stripe-webhook] DB update failed:', error.message)
        } else {
          console.log('[stripe-webhook] DB updated — customer', customerId, 'reverted to hosted_free (status:', sub.status, ')')
        }
      }
      break
    }

    default:
      console.log('[stripe-webhook] Unhandled event type:', event.type)
  }

  return NextResponse.json({ received: true })
}
