import { createClient } from '@/lib/supabase'

const FAILED = "Couldn't delete your account. Please try again."

// Self-serve deletion (#144) through the account function, which cancels any
// subscription and deletes the account. Then signs this browser out: signOut
// still calls /logout, which answers 403 for a deleted user (a console line),
// and supabase-js clears the session cookies anyway.
export async function deleteAccount(): Promise<{ deleted?: true; error?: string }> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Please sign in again.' }
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/account`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${session.access_token}` },
  })
  // An expired session, or an account already deleted (another tab, or a
  // retry after the first reply was lost).
  if (res.status === 401) return { error: "Your session has ended. If you just deleted your account, it's gone. Otherwise, sign in again." }
  // A gateway error (502/504) can come back as an HTML page, not JSON.
  const data = (await res.json().catch(() => null)) as { deleted?: true; error?: string } | null
  if (!data?.deleted) return { error: data?.error ?? FAILED }
  await supabase.auth.signOut({ scope: 'local' })
  return { deleted: true }
}
