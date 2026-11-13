// The first-month offer (#213, migration 030), for generate, tailor and
// billing. A Stripe coupon, so the amount lives in Stripe and not in this
// public repo. Unset turns the whole offer off.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export const FIRST_MONTH_COUPON = Deno.env.get('STRIPE_FIRST_MONTH_COUPON_ID')

// Starts the offer if it never started (it opens a day later, so a first call
// returns null), then returns when it ends if it's open now, else null.
export async function openFirstMonthOffer(supabase: SupabaseClient, userId: string): Promise<string | null> {
  if (!FIRST_MONTH_COUPON) return null
  const { data, error } = await supabase.rpc('open_first_month_offer', { p_user_id: userId })
  if (error) console.error('Offer RPC error:', error.message)
  return (data as string | null) ?? null
}
