import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

// Everything a sender of non-account email needs (#114). Supabase Auth's own
// emails (confirm, reset, change email) don't go through here.
//
// Before sending:  if (!(await canEmail(supabase, userId, 'onboarding'))) skip
// With the email:  headers = await unsubscribeHeaders(userId), and a link to
//                  await unsubscribeUrl(userId) in the body.

export type EmailKind = 'product_updates' | 'onboarding'

// Senders never read the consent columns themselves (#114).
export async function canEmail(supabase: SupabaseClient, userId: string, kind: EmailKind): Promise<boolean> {
  const { data, error } = await supabase.rpc('can_email', { p_user_id: userId, p_kind: kind })
  return !error && data === true
}

// Unsubscribe tokens never expire: the law wants a link to keep working for at
// least 60 days after sending (#114).
function key(): Promise<CryptoKey> {
  const secret = Deno.env.get('EMAIL_TOKEN_SECRET')
  if (!secret) throw new Error('EMAIL_TOKEN_SECRET is not set')
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function unsubscribeToken(userId: string): Promise<string> {
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', await key(), new TextEncoder().encode(`unsubscribe:${userId}`)))
  const b64 = btoa(String.fromCharCode(...mac)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${userId}.${b64}`
}

// subtle.verify compares in constant time (#114).
export async function verifyUnsubscribeToken(token: string): Promise<string | null> {
  const [userId, mac, extra] = token.split('.')
  if (extra !== undefined || !UUID.test(userId ?? '') || !mac) return null
  let sig: Uint8Array
  try {
    sig = Uint8Array.from(atob(mac.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
  } catch {
    return null
  }
  const ok = await crypto.subtle.verify('HMAC', await key(), sig, new TextEncoder().encode(`unsubscribe:${userId}`))
  return ok ? userId : null
}

export async function unsubscribeUrl(userId: string): Promise<string> {
  const site = (Deno.env.get('SITE_URL') || 'https://www.cover-me.dev').replace(/\/+$/, '')
  return `${site}/unsubscribe?token=${encodeURIComponent(await unsubscribeToken(userId))}`
}

// The mail client POSTs to this URL itself: https://www.rfc-editor.org/rfc/rfc8058
export async function unsubscribeHeaders(userId: string): Promise<Record<string, string>> {
  const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/email-preferences?token=${encodeURIComponent(await unsubscribeToken(userId))}`
  return { 'List-Unsubscribe': `<${url}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
}
