// The plan numbers the site's copy quotes: a copy of generation_limits() in
// the latest migration that defines it (plan-limits.test.ts keeps them equal).
// Answers have their own allowance and never use up letters or resumes.
export const PLAN_LIMITS = {
  free_starter: 10,
  free_weekly: 5,
  pro_daily: 25,
  answer_starter: 5,
  answer_weekly: 5,
  answer_pro_daily: 50,
}

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
  if (a.kind === 'starter') return { label: 'Free generations to start', used, limit: a.limit, resets: `Then ${PLAN_LIMITS.free_weekly} a week` }
  if (a.kind === 'weekly') return { label: 'Free generations this week', used, limit: a.limit, resets: 'Resets Monday, 00:00 UTC' }
  return { label: 'Generations today', used, limit: a.limit, resets: 'Resets at midnight UTC' }
}

// Answers to application questions have their own allowance (my_answer_allowance,
// migration 032). Null when it couldn't be read, so the line is left out.
export function describeAnswers(a: Allowance | null): string | null {
  if (!a) return null
  const left = Math.max(0, Math.min(a.remaining, a.limit))
  if (a.kind === 'starter') return `${left} of ${a.limit} free left to start`
  if (a.kind === 'weekly') return `${left} of ${a.limit} free left this week`
  return `${left} of ${a.limit} left today`
}
