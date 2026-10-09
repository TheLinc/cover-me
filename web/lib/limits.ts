// The hosted allowance as the database reports it (my_generation_allowance,
// migration 015). The numbers come from the database; this only words them.
export interface Allowance {
  kind: 'starter' | 'weekly' | 'daily'
  limit: number
  used: number
  remaining: number
  allowed: boolean
  resets_at: string | null
  pro_daily: number
}

export function describeAllowance(a: Allowance): { label: string; used: number; limit: number; resets: string } {
  if (a.kind === 'starter') return { label: 'Free generations to start', used: a.used, limit: a.limit, resets: 'Then 5 a week' }
  if (a.kind === 'weekly') return { label: 'Free generations this week', used: a.used, limit: a.limit, resets: 'Monday, 00:00 UTC' }
  return { label: 'Generations today', used: a.used, limit: a.limit, resets: 'Midnight UTC' }
}
