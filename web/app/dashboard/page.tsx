import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import DashboardClient from './DashboardClient'
import type { Allowance } from '@/lib/limits'
import { avatarUrl } from '@/lib/avatar'
import { RecentApplications, RecentApplicationsSkeleton } from './ApplicationHistory'
import { Toaster } from '@/components/ui/sonner'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data: userData } = await supabase
    .from('users')
    .select('tier, created_at')
    .eq('id', user.id)
    .single()

  // Usage against the free starter, the free week, or Pro's daily cap
  // (migration 015). The database owns the numbers.
  const { data: allowance } = await supabase.rpc('my_generation_allowance')

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
      memberSince={userData?.created_at ?? user.created_at}
      allowance={(allowance as Allowance | null) ?? null}
      history={history}
    />
    <Toaster />
    </>
  )
}
