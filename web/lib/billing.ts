import { createClient } from '@/lib/supabase'

type BillingReply = { url?: string; error?: string; trialEnd?: string; note?: string | null }

async function callBilling(body: Record<string, string>): Promise<BillingReply> {
  const { data: { session } } = await createClient().auth.getSession()
  if (!session) return { error: 'Please sign in again.' }
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/billing`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  // A gateway error (502/504) can come back as an HTML page, not JSON.
  const data = (await res.json().catch(() => null)) as BillingReply | null
  return data ?? { error: 'Could not reach billing. Please try again.' }
}

export function openBilling(action: 'checkout' | 'portal', plan?: 'monthly' | 'quarterly'): Promise<BillingReply> {
  return callBilling(plan ? { action, plan } : { action })
}

// Starts a gift trial from a /redeem link: trialEnd and the code's note, or an error.
export function redeemTrial(code: string): Promise<BillingReply> {
  return callBilling({ action: 'redeem', code })
}
