import { createClient } from '@/lib/supabase'

// Email consent (#114), through the email-preferences function: users is
// server-owned, so the browser can't write it directly.
const URL_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/email-preferences`

// The dashboard toggle, or the signup box after a Google signup.
export async function saveProductUpdates(value: boolean, source: 'signup' | 'dashboard'): Promise<{ product_updates?: boolean; error?: string }> {
  const { data: { session } } = await createClient().auth.getSession()
  if (!session) return { error: 'Please sign in again.' }
  const res = await fetch(URL_BASE, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_updates: value, source }),
  })
  // A gateway error (502/504) can come back as an HTML page, not JSON.
  const data = (await res.json().catch(() => null)) as { product_updates?: boolean; error?: string } | null
  return data ?? { error: "Couldn't save that. Please try again." }
}

// The unsubscribe link's token: works signed out.
export async function unsubscribe(token: string): Promise<{ unsubscribed?: boolean; error?: string }> {
  const res = await fetch(`${URL_BASE}?token=${encodeURIComponent(token)}`, { method: 'POST' })
  const data = (await res.json().catch(() => null)) as { unsubscribed?: boolean; error?: string } | null
  return data ?? { error: "Couldn't unsubscribe right now. Please try again." }
}
