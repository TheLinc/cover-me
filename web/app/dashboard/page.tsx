import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import DashboardClient from './DashboardClient'
import type { Allowance } from '@/lib/limits'

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

  return (
    <DashboardClient
      email={user.email ?? ''}
      tier={userData?.tier ?? 'hosted_free'}
      memberSince={userData?.created_at ?? user.created_at}
      allowance={(allowance as Allowance | null) ?? null}
    />
  )
}
