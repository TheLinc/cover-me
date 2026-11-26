import { createClient } from 'npm:@supabase/supabase-js@2'
import { secretMatches } from '../_shared/secret.ts'
import { json } from '../_shared/cors.ts'
import { SEND_GAP_MS, sendEmail } from '../_shared/resend.ts'

const SERVICE_KEY = Deno.env.get('SERVICE_KEY')!
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, SERVICE_KEY)
const HOST = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9-]{2,}$/

// "Email me when it's supported" (#195). When support for a site
// ships, the developer runs `pnpm notify-site <host>`, which POSTs { host }
// here with the service key in X-Service-Key: the gateway may rewrite an
// Authorization header that carries an API key. Each account in site_watch
// for that host gets one email, and its row goes. Logs carry counts only, never who or which site.
Deno.serve(async (req) => {
  if (!(await secretMatches(req.headers.get('X-Service-Key'), SERVICE_KEY))) return json({ error: 'Invalid token' }, 401)
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const host = (await req.json().catch(() => null) as { host?: unknown } | null)?.host
  if (typeof host !== 'string' || !HOST.test(host)) return json({ error: 'Invalid host' }, 400)

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
    const { data: claimed, error: claimError } = await supabase.from('site_watch').delete().eq('host', host).eq('user_id', row.user_id).select('user_id')
    if (claimError) {
      console.error('[site-watch] claim:', claimError.code)
      failed++
      continue
    }
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

function send(to: string, host: string) {
  return sendEmail('site-watch', () => ({
    to: [to],
    subject: `You asked about ${host}`,
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
      "You're getting this one email because you ticked \"Email me when it's supported\" for this site. We've now deleted that request.",
    ].join('\n'),
  }))
}
