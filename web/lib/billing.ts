import { createClient } from '@/lib/supabase'

export async function openBilling(action: 'checkout' | 'portal'): Promise<{ url?: string; error?: string }> {
  const { data: { session } } = await createClient().auth.getSession()
  if (!session) return { error: 'Please sign in again.' }
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/billing`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  })
  return (await res.json()) as { url?: string; error?: string }
}
