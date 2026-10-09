// Generation limits for hosted users. The numbers live in the database
// (generation_limits(), migration 015); consume_generation applies them
// atomically and reports what it applied, so this file never hardcodes them.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export interface Allowance {
  kind: 'starter' | 'weekly' | 'daily'
  limit: number
  used: number
  remaining: number
  allowed: boolean
  resets_at: string | null
  pro_daily: number
}

export function limitMessage(a: Allowance): string {
  if (a.kind === 'daily') {
    return `You've reached Pro's fair-use limit of ${a.limit} generations today. It resets at midnight UTC.`
  }
  return `You've used this week's ${a.limit} free generations. They reset Monday at 00:00 UTC, or upgrade to Pro for up to ${a.pro_daily} a day.`
}

// Takes one generation from the user's allowance, or explains why not.
export async function consumeGeneration(supabase: SupabaseClient, userId: string):
  Promise<{ ok: true } | { ok: false; status: 429 | 500; body: Record<string, unknown> }> {
  const { data, error } = await supabase.rpc('consume_generation', { p_user_id: userId })
  if (error) {
    console.error('Allowance RPC error:', error.message)
    return { ok: false, status: 500, body: { error: 'Could not check your allowance. Please try again.' } }
  }
  const allowance = data as Allowance
  if (!allowance.allowed) return { ok: false, status: 429, body: { error: limitMessage(allowance), allowance } }
  return { ok: true }
}
