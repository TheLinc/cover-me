import { createClient } from 'npm:@supabase/supabase-js@2'
import { json } from '../_shared/cors.ts'
import { unsubscribeHeaders, unsubscribeUrl } from '../_shared/email-consent.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SECRET_KEY = Deno.env.get('SERVICE_KEY')!
const RESEND_API_BASE = (Deno.env.get('RESEND_API_BASE') || 'https://api.resend.com').replace(/\/+$/, '')
const FROM = 'Lincoln from Cover Me <lincoln@cover-me.dev>'
const REPLY_TO = 'lincoln@cover-me.dev'
// Resend's default limit is 2 requests a second.
const SEND_GAP_MS = 550

// The one-day follow-up (#113). The daily workflow (.github/workflows/nudge.yml)
// POSTs here with NUDGE_SECRET. Who gets it is nudge_candidates() (migration
// 024), which goes through can_email(..., 'onboarding'). Unsubscribing is
// email-preferences' job; this only links to it.
// Sends nothing until the NUDGE_ENABLED secret is "true".
Deno.serve(async (req) => {
  if (!(await isScheduler(req))) return json({ error: 'Invalid token' }, 401)
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const sent = { resume: 0, no_resume: 0 }
  if (Deno.env.get('NUDGE_ENABLED') !== 'true') return json({ enabled: false, sent, failed: 0 })

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)
  const { data: candidates, error } = await supabase.rpc('nudge_candidates')
  if (error) {
    console.error('[nudge] candidates:', error.message)
    return json({ error: 'Could not read candidates' }, 500)
  }

  let failed = 0
  for (const [i, c] of (candidates as Candidate[]).entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, SEND_GAP_MS))
    // Claim before sending, so the email goes out at most once even if a write
    // fails or two runs overlap. Only a send Resend refused releases the
    // claim for the next run; after a timeout it may have gone out, so it stays.
    const { data: claimed, error: claimError } = await supabase.from('users').update({ nudge_sent_at: new Date().toISOString() })
      .eq('id', c.user_id).is('nudge_sent_at', null).select('id')
    if (claimError) {
      console.error('[nudge] claim:', claimError.message)
      failed++
      continue
    }
    if (!claimed?.length) continue
    const version = c.has_resume ? 'resume' : 'no_resume'
    const outcome = await send(c, VERSIONS[version])
    if (outcome === 'sent') {
      sent[version]++
      continue
    }
    failed++
    if (outcome === 'refused') {
      const { error: releaseError } = await supabase.from('users').update({ nudge_sent_at: null }).eq('id', c.user_id)
      if (releaseError) console.error('[nudge] release:', releaseError.message)
    }
  }

  // Counts only: nothing that identifies anyone.
  console.log(`[nudge] sent resume=${sent.resume} no_resume=${sent.no_resume} failed=${failed}`)
  return json({ enabled: true, sent, failed })
})

async function isScheduler(req: Request): Promise<boolean> {
  const secret = Deno.env.get('NUDGE_SECRET')
  const given = req.headers.get('Authorization')?.replace(/^Bearer /, '')
  if (!secret || !given) return false
  // Compare digests, so the time taken says nothing about the secret.
  const digest = async (s: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))
  const [a, b] = await Promise.all([digest(secret), digest(given)])
  return a.reduce((diff, byte, i) => diff | (byte ^ b[i]), 0) === 0
}

type Candidate = { user_id: string; email: string; has_resume: boolean }

const VERSIONS = {
  resume: {
    subject: 'Your resume is in. Try it on one job',
    opening: "You added your resume to Cover Me yesterday but haven't tailored it to a job yet.",
  },
  no_resume: {
    subject: 'One step left: add your resume',
    opening: "You made a Cover Me account yesterday. Add your resume in the extension's Settings and you're one click from a tailored resume.",
  },
}

async function send({ user_id: userId, email }: Candidate, { subject, opening }: { subject: string; opening: string }): Promise<'sent' | 'refused' | 'unknown'> {
  try {
    const text = `${opening}

Open any job posting on LinkedIn, Indeed, Greenhouse, Lever or Workday, click the Cover Me icon, and press Tailor. It takes about 30 seconds, and you get 10 free to start.

If something didn't work, reply to this email. I read every one.

Lincoln

-- 
Don't want emails like this? Unsubscribe: ${await unsubscribeUrl(userId)}
`
    const res = await fetch(`${RESEND_API_BASE}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        reply_to: REPLY_TO,
        subject,
        text,
        headers: await unsubscribeHeaders(userId),
      }),
      // One stuck send mustn't run the whole batch into the function time limit.
      signal: AbortSignal.timeout(15_000),
    })
    if (res.ok) return 'sent'
    console.error(`[nudge] Resend answered ${res.status}`)
    return 'refused'
  } catch (err) {
    console.error('[nudge] send failed:', err instanceof Error ? err.message : 'unknown error')
    return 'unknown'
  }
}
