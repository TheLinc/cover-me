import { createClient } from '@/lib/supabase'

export async function openBilling(action: 'checkout' | 'portal'): Promise<{ url?: string; error?: string }> {
  const { data: { session } } = await createClient().auth.getSession()
  if (!session) return { error: 'Please sign in again.' }
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/billing`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  })
  // A gateway error (502/504) can come back as an HTML page, not JSON.
  const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null
  return data ?? { error: 'Could not reach billing. Please try again.' }
}
