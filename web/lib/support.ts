import { createClient } from '@/lib/supabase'

// The dashboard's support form (#133), through the support function.
const URL_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/support`

export type SupportType = 'problem' | 'feature' | 'account' | 'job_site' | 'other'

// A pasted URL or a bare hostname, reduced to the hostname: lowercase, no
// leading www. Null when it isn't a dotted hostname the function would take.
export function siteHost(input: string): string | null {
  const text = input.trim()
  if (!text) return null
  try {
    const host = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`).hostname.replace(/^www\./, '')
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) && host.length <= 253 ? host : null
  } catch {
    return null
  }
}

export async function sendSupport(body: { type: SupportType; message: string; site?: string }): Promise<'sent' | 'limited' | 'failed'> {
  try {
    const { data: { session } } = await createClient().auth.getSession()
    if (!session) return 'failed'
    const res = await fetch(URL_BASE, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return res.ok ? 'sent' : res.status === 429 ? 'limited' : 'failed'
  } catch {
    return 'failed'
  }
}
