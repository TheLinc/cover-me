import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SECRET_KEY = Deno.env.get('SERVICE_KEY')!
const RESEND_API_BASE = (Deno.env.get('RESEND_API_BASE') || 'https://api.resend.com').replace(/\/+$/, '')
const INBOX = 'support@cover-me.dev'
const MAX_MESSAGE = 1000
const PER_MINUTE = 2
const PER_DAY = 5
const TRIAL_MS = 7 * 86_400_000
// The subject's label comes from here, never from the request.
const TYPES: Record<string, string> = {
  problem: "Something isn't working",
  feature: 'Feature request',
  account: 'Account or billing',
  job_site: 'Request a job site',
  other: 'Something else',
}
const HOSTNAME = /^[a-z0-9.-]{1,253}$/i

// The dashboard's support form (#133). POST { type, message, site? } with the
// user's token sends one email to the support inbox, replying to the account.
// Logs carry status codes only: never the message, the email or the site.
Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return json({ error: 'Unauthorized' }, 401)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return json({ error: 'Invalid token' }, 401)

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // Validated before the rate limit, so a malformed body doesn't use it up.
  const body = await req.json().catch(() => null) as { type?: unknown; message?: unknown; site?: unknown } | null
  const type = typeof body?.type === 'string' && Object.hasOwn(TYPES, body.type) ? body.type : null
  if (!type) return json({ error: 'Unknown type' }, 400)
  if (body!.message !== undefined && typeof body!.message !== 'string') return json({ error: 'Invalid message' }, 400)
  const message = ((body!.message as string | undefined) ?? '').trim()
  if (message.length > MAX_MESSAGE) return json({ error: 'Message too long' }, 400)
  if (!message && type !== 'job_site') return json({ error: 'Missing message' }, 400)
  let site: string | null = null
  if (type === 'job_site') {
    if (typeof body!.site !== 'string' || !HOSTNAME.test(body!.site)) return json({ error: 'Invalid site' }, 400)
    site = body!.site
  }

  // A self-hosted backend may have no Resend account.
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return json({ error: 'Support email is not set up' }, 503)

  // The scrape limiter's counter, keyed by a hash of the account (like resume's
  // parse limit). Fails closed.
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`support:${user.id}`)))
  const { data: allowed, error: limitError } = await supabase.rpc('check_scrape_rate_limit', {
    p_ip_hash: Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join(''),
    p_per_minute: PER_MINUTE,
    p_per_day: PER_DAY,
  })
  if (limitError || !allowed) return json({ error: 'Too many messages' }, 429)

  const plan = await planLabel(supabase, user.id)
  const text = [
    `Type: ${TYPES[type]}`,
    ...(site ? [`Job site: ${site}`] : []),
    '',
    message || '(no message)',
    '',
    '--',
    `Account email: ${user.email}`,
    `Account ID: ${user.id}`,
    `Plan: ${plan}`,
  ].join('\n')

  try {
    const res = await fetch(`${RESEND_API_BASE}/emails`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Cover Me <${INBOX}>`,
        to: [INBOX],
        reply_to: user.email,
        subject: `[${TYPES[type]}] from a ${plan} account`,
        text,
      }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) {
      console.error(`[support] Resend answered ${res.status}`)
      return json({ error: 'Could not send' }, 502)
    }
  } catch {
    console.error('[support] Resend unreachable')
    return json({ error: 'Could not send' }, 502)
  }
  return json({ sent: true })
})

// "Trial" for a gift trial redeemed in the last week: no Stripe call needed.
async function planLabel(supabase: ReturnType<typeof createClient>, userId: string): Promise<'Free' | 'Pro' | 'Trial'> {
  const { data: row } = await supabase.from('users').select('tier').eq('id', userId).single()
  if (row?.tier !== 'hosted_pro') return 'Free'
  const { data: trial } = await supabase.from('trial_codes').select('code')
    .eq('redeemed_by', userId).gte('redeemed_at', new Date(Date.now() - TRIAL_MS).toISOString()).maybeSingle()
  return trial ? 'Trial' : 'Pro'
}
