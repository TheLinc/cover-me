// Server-side events to PostHog (#130, #131). Does nothing until the
// POSTHOG_KEY secret is set (`supabase secrets set POSTHOG_KEY=phc_...`).
// POSTHOG_HOST overrides the US cloud host (the function tests point it at
// their mock). $process_person_profile: false counts events by distinct_id
// without creating PostHog person profiles.
//
// A count tied to an account goes through captureUsage, never capture: it
// skips accounts that opted out (migration 028). The privacy policy allows
// only booleans and fixed values in those properties, never resume, letter,
// context, job or company text, file names or posting addresses.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

const POSTHOG_KEY = Deno.env.get('POSTHOG_KEY') ?? ''
const POSTHOG_HOST = Deno.env.get('POSTHOG_HOST') ?? 'https://us.i.posthog.com'

// false when PostHog didn't take the event; true when it did, or when there's
// no key to send with.
export async function capture(event: string, distinctId: string, properties: Record<string, unknown>): Promise<boolean> {
  if (!POSTHOG_KEY) return true
  try {
    const res = await fetch(`${POSTHOG_HOST}/i/v0/e/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event,
        distinct_id: distinctId,
        properties: { ...properties, $process_person_profile: false },
      }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) console.error(`PostHog ${event}: ${res.status}`)
    return res.ok
  } catch {
    console.error(`PostHog ${event}: send failed`)
    return false
  }
}

// A Hosted account's usage count. Sends nothing when the account opted out,
// or when that can't be read.
export async function captureUsage(supabase: SupabaseClient, event: string, userId: string, properties: Record<string, unknown>): Promise<void> {
  if (!POSTHOG_KEY) return
  const { data, error } = await supabase.from('users').select('usage_counts_opted_out_at').eq('id', userId).single()
  if (error || !data || data.usage_counts_opted_out_at) return
  await capture(event, userId, properties)
}
