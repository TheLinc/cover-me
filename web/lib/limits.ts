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

// Null when the allowance couldn't be read (the RPC failed or migration 015
// isn't deployed yet): the dashboard still renders, without usage.
export function describeAllowance(a: Allowance | null): { label: string; used: number; limit: number; resets: string } | null {
  if (!a) return null
  // Usage from before the relaunch rules can exceed the new limit until the week rolls over.
  const used = Math.min(a.used, a.limit)
  if (a.kind === 'starter') return { label: 'Free generations to start', used, limit: a.limit, resets: 'Then 5 a week' }
  if (a.kind === 'weekly') return { label: 'Free generations this week', used, limit: a.limit, resets: 'Monday, 00:00 UTC' }
  return { label: 'Generations today', used, limit: a.limit, resets: 'Midnight UTC' }
}
