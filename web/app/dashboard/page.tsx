import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import DashboardClient from './DashboardClient'
import type { Allowance } from '@/lib/limits'
import { avatarUrl } from '@/lib/avatar'
import { RecentApplications, RecentApplicationsSkeleton } from './ApplicationHistory'
import { Toaster } from '@/components/ui/sonner'
import Stripe from 'stripe'
import { trialState, type TrialState } from '@/lib/stripe-tier'

const NO_TRIAL: TrialState = { giftTrialEnd: null, firstPayment: null }

// A gift trial's end (#112), or the first payment of a plan bought during one.
// A slow or failed Stripe read shows the plain Pro tile instead.
async function readTrial(customer: string): Promise<TrialState> {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { timeout: 3000, maxNetworkRetries: 0 })
    return trialState((await stripe.subscriptions.list({ customer, status: 'trialing', limit: 10 })).data)
  } catch {
    return NO_TRIAL
  }
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data: userData } = await supabase
    .from('users')
    .select('tier, created_at, stripe_customer_id, product_updates')
    .eq('id', user.id)
    .single()

  // Usage against the free starter, the free week, or Pro's daily cap
  // (migration 015). The database owns the numbers.
  const [{ data: allowance }, trial] = await Promise.all([
    supabase.rpc('my_generation_allowance'),
    userData?.tier === 'hosted_pro' && userData.stripe_customer_id ? readTrial(userData.stripe_customer_id) : NO_TRIAL,
  ])

  // Recent applications, every account's (#101), streamed in so the rest of
  // the page doesn't wait on them. The session's token is forwarded to the
  // function, which verifies it.
  let history = null
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    history = (
      <Suspense fallback={<RecentApplicationsSkeleton />}>
        <RecentApplications accessToken={session.access_token} pro={userData?.tier === 'hosted_pro'} />
      </Suspense>
    )
  }

  return (
    <>
    <DashboardClient
      email={user.email ?? ''}
      avatar={avatarUrl(user.user_metadata)}
      tier={userData?.tier ?? 'hosted_free'}
      trial={trial}
      memberSince={userData?.created_at ?? user.created_at}
      allowance={(allowance as Allowance | null) ?? null}
      productUpdates={userData?.product_updates ?? false}
      history={history}
    />
    <Toaster />
    </>
  )
}
