// Generation limits for hosted users. The numbers live in the database
// (generation_limits(), migration 015); consume_generation applies them
// atomically and reports what it applied, so this file never hardcodes them.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

const FIRST_MONTH_COUPON = Deno.env.get('STRIPE_FIRST_MONTH_COUPON_ID')

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

// The first-month offer (#213, migration 030). Taking the week's last free
// generation, or being refused one, starts it; it opens a day later. Returns
// when it ends if it's open now. Off while the coupon secret isn't set.
async function firstMonthOffer(supabase: SupabaseClient, userId: string, a: Allowance): Promise<string | null> {
  if (!FIRST_MONTH_COUPON || a.kind !== 'weekly' || a.remaining > 1) return null
  const { data, error } = await supabase.rpc('open_first_month_offer', { p_user_id: userId })
  if (error) console.error('Offer RPC error:', error.message)
  return (data as string | null) ?? null
}

// No price: the extension's buttons still show the full one, and the repo
// holds no discount amount.
const offerLine = (endsAt: string) =>
  ` Your first month of monthly Pro is discounted at checkout until ${
    new Date(endsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })}.`

// Takes one generation from the user's allowance, or explains why not.
export async function consumeGeneration(supabase: SupabaseClient, userId: string):
  Promise<{ ok: true } | { ok: false; status: 429 | 500; body: Record<string, unknown> }> {
  const { data, error } = await supabase.rpc('consume_generation', { p_user_id: userId })
  if (error) {
    console.error('Allowance RPC error:', error.message)
    return { ok: false, status: 500, body: { error: 'Could not check your allowance. Please try again.' } }
  }
  const allowance = data as Allowance
  const offerEnds = await firstMonthOffer(supabase, userId, allowance)
  if (!allowance.allowed) {
    return { ok: false, status: 429, body: { error: limitMessage(allowance) + (offerEnds ? offerLine(offerEnds) : ''), allowance } }
  }
  return { ok: true }
}
