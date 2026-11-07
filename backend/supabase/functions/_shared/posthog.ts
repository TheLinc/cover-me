// Server-side events to PostHog (#130, #131). Does nothing until the
// POSTHOG_KEY secret is set (`supabase secrets set POSTHOG_KEY=phc_...`).
// POSTHOG_HOST overrides the US cloud host (the function tests point it at
// their mock). $process_person_profile: false counts events by distinct_id
// without creating PostHog person profiles.

const POSTHOG_KEY = Deno.env.get('POSTHOG_KEY') ?? ''
const POSTHOG_HOST = Deno.env.get('POSTHOG_HOST') ?? 'https://us.i.posthog.com'

export async function capture(event: string, distinctId: string, properties: Record<string, unknown>): Promise<void> {
  if (!POSTHOG_KEY) return
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
  } catch {
    console.error(`PostHog ${event}: send failed`)
  }
}
