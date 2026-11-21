import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/supabase-server'
import DashboardClient from './DashboardClient'
import type { Allowance } from '@/lib/limits'
import { avatarUrl } from '@/lib/avatar'
import { greetingFor } from '@/lib/greeting'
import { RecentApplications, RecentApplicationsSkeleton } from './ApplicationHistory'
import { Toaster } from '@/components/ui/sonner'
import { readPlan } from '@/lib/stripe-plan'

export default async function DashboardPage() {
  const { supabase, user } = await getServerUser()

  if (!user) redirect('/auth')

  const { data: userData } = await supabase
    .from('users')
    .select('tier, stripe_customer_id')
    .eq('id', user.id)
    .single()

  const [{ data: allowance }, { data: answers }, trial] = await Promise.all([
    supabase.rpc('my_generation_allowance'),
    supabase.rpc('my_answer_allowance'),
    readPlan(userData?.tier === 'hosted_pro' ? userData.stripe_customer_id : null),
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
      greeting={greetingFor(new Date())}
      tier={userData?.tier ?? 'hosted_free'}
      trial={trial}
      allowance={(allowance as Allowance | null) ?? null}
      answers={(answers as Allowance | null) ?? null}
      history={history}
    />
    <Toaster />
    </>
  )
}
