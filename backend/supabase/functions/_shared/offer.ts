// The first-month offer (#213, migration 030), for generate, tailor and
// billing. A Stripe coupon, so the amount lives in Stripe and not in this
// public repo. Unset turns the whole offer off.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export const FIRST_MONTH_COUPON = Deno.env.get('STRIPE_FIRST_MONTH_COUPON_ID')

// Hitting the limit or leaving checkout: the offer becomes available a day
// from now, if it never was.
export async function openFirstMonthOffer(supabase: SupabaseClient, userId: string): Promise<void> {
  if (!FIRST_MONTH_COUPON) return
  const { error } = await supabase.rpc('open_first_month_offer', { p_user_id: userId })
  if (error) console.error('Offer RPC error:', error.message)
}

// Showing or applying it: the first time starts its 7 days. Returns when it
// ends, or null when there's nothing to show.
export async function showFirstMonthOffer(supabase: SupabaseClient, userId: string): Promise<string | null> {
  if (!FIRST_MONTH_COUPON) return null
  const { data, error } = await supabase.rpc('show_first_month_offer', { p_user_id: userId })
  if (error) console.error('Offer RPC error:', error.message)
  return (data as string | null) ?? null
}
