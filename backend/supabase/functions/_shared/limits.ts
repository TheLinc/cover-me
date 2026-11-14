// Generation limits for hosted users. The numbers live in the database
// (generation_limits(), migration 015); consume_generation applies them
// atomically and reports what it applied, so this file never hardcodes them.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { openFirstMonthOffer, showFirstMonthOffer } from './offer.ts'

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

// The first-month offer's line (#213), for extension builds older than the
// one whose upgrade prompt shows the offer itself. That build drops this exact
// sentence (OFFER_SENTENCE in extension/src/lib/auth.ts), so keep the two in
// step. No price, since the buttons still show the full one, and days left
// rather than a date, since the server can't know the reader's time zone.
function offerLine(endsAt: string): string {
  const days = Math.max(1, Math.ceil((Date.parse(endsAt) - Date.now()) / 86_400_000))
  return ` Your first month of monthly Pro is discounted at checkout for ${days} more day${days === 1 ? '' : 's'}.`
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
  // Taking the week's last free generation, or being refused one, makes the
  // first-month offer available a day later. A refusal names it once it is.
  if (allowance.kind === 'weekly' && allowance.remaining <= 1) await openFirstMonthOffer(supabase, userId)
  if (!allowance.allowed) {
    const offerEndsAt = allowance.kind === 'weekly' ? await showFirstMonthOffer(supabase, userId) : null
    return { ok: false, status: 429, body: { error: limitMessage(allowance) + (offerEndsAt ? offerLine(offerEndsAt) : ''), allowance } }
  }
  return { ok: true }
}
