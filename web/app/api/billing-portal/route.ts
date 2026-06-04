import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

    // Use the service-role client so RLS doesn't hide stripe_customer_id.
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
    )

    const { data: userData } = await adminSupabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    let customerId = userData?.stripe_customer_id as string | null

    // Fallback: webhook may not have fired yet — look the customer up by email.
    if (!customerId && user.email) {
      const result = await stripe.customers.list({ email: user.email, limit: 1 })
      customerId = result.data[0]?.id ?? null

      // Write it back so future requests are instant.
      if (customerId) {
        await adminSupabase
          .from('users')
          .update({ stripe_customer_id: customerId })
          .eq('id', user.id)
      }
    }

    if (!customerId) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 400 })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/dashboard`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/billing-portal]', message)
    const clientMessage = process.env.NODE_ENV === 'development'
      ? message
      : 'Could not open billing portal. Please try again.'
    return NextResponse.json({ error: clientMessage }, { status: 500 })
  }
}
