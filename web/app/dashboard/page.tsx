import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data: userData } = await supabase
    .from('users')
    .select('tier, created_at')
    .eq('id', user.id)
    .single()

  const { data: rateData } = await supabase
    .from('rate_limits')
    .select('count')
    .eq('user_id', user.id)
    .eq('date', new Date().toISOString().split('T')[0])
    .single()

  const { upgraded } = await searchParams

  return (
    <DashboardClient
      email={user.email ?? ''}
      tier={userData?.tier ?? 'hosted_free'}
      memberSince={userData?.created_at ?? user.created_at}
      usageToday={rateData?.count ?? 0}
      justUpgraded={upgraded === '1'}
    />
  )
}
