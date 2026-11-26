import { createClient } from 'npm:@supabase/supabase-js@2'
import { hasBearer } from '../_shared/bearer.ts'
import { json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SECRET_KEY = Deno.env.get('SERVICE_KEY')!
const RESEND_API_BASE = (Deno.env.get('RESEND_API_BASE') || 'https://api.resend.com').replace(/\/+$/, '')
const FROM = 'Lincoln from Cover Me <lincoln@cover-me.dev>'
const REPLY_TO = 'lincoln@cover-me.dev'
const SEND_GAP_MS = 550
const HOST = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9-]{2,}$/

// "Email me when Cover Me reads this site" (#195). When support for a site
// ships, the developer runs `pnpm notify-site <host>`, which POSTs { host }
// here with the service key. Each account in site_watch for that host gets
// one email, and its row goes. Logs carry counts only, never who or which site.
Deno.serve(async (req) => {
  if (!(await hasBearer(req, SUPABASE_SECRET_KEY))) return json({ error: 'Invalid token' }, 401)
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const host = (await req.json().catch(() => null) as { host?: unknown } | null)?.host
  if (typeof host !== 'string' || !HOST.test(host)) return json({ error: 'Invalid host' }, 400)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)
  const { data: rows, error } = await supabase.from('site_watch').select('user_id, created_at').eq('host', host)
  if (error) {
    console.error('[site-watch] read:', error.code)
    return json({ error: 'Could not read watchers' }, 500)
  }

  let sent = 0
  let failed = 0
  for (const [i, row] of rows.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, SEND_GAP_MS))
    // Deleted before sending, like nudge's claim (#113): at most one email
    // each. Only a send Resend refused puts the row back for the next run.
    const { data: claimed } = await supabase.from('site_watch').delete().eq('host', host).eq('user_id', row.user_id).select('user_id')
    if (!claimed?.length) continue
    const { data: { user } } = await supabase.auth.admin.getUserById(row.user_id)
    const outcome = user?.email ? await send(user.email, host) : 'refused'
    if (outcome === 'sent') {
      sent++
      continue
    }
    failed++
    if (outcome === 'refused') {
      const { error: restoreError } = await supabase.from('site_watch').insert({ host, ...row })
      if (restoreError) console.error('[site-watch] restore:', restoreError.code)
    }
  }

  console.log(`[site-watch] sent=${sent} failed=${failed}`)
  return json({ sent, failed })
})

async function send(to: string, host: string): Promise<'sent' | 'refused' | 'unknown'> {
  try {
    const res = await fetch(`${RESEND_API_BASE}/emails`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        reply_to: REPLY_TO,
        subject: `Cover Me now reads ${host}`,
        text: [
          'Hi,',
          '',
          `You asked Cover Me to email you once it could read job postings on ${host}. It can now.`,
          '',
          'Open a posting there, click the Cover Me icon and press Generate or Tailor. If your extension has not updated yet, Chrome does that within a day.',
          '',
          "If something on that site still doesn't come out right, reply to this email and tell me what you see.",
          '',
          'Lincoln',
          'Cover Me',
          '',
          "You're getting this one email because you ticked \"Email me when Cover Me reads this site\". We've now deleted that request.",
        ].join('\n'),
      }),
      signal: AbortSignal.timeout(15_000),
    })
    if (res.ok) return 'sent'
    console.error(`[site-watch] Resend answered ${res.status}`)
    return 'refused'
  } catch {
    console.error('[site-watch] Resend unreachable')
    return 'unknown'
  }
}
