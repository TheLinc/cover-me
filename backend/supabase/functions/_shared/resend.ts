const RESEND_API_BASE = (Deno.env.get('RESEND_API_BASE') || 'https://api.resend.com').replace(/\/+$/, '')
// Resend allows 2 requests a second by default (#113).
export const SEND_GAP_MS = 550

type Email = { to: string[]; subject: string; text: string; html?: string; headers?: Record<string, string> }

// The developer's own emails, which replies reach (#113, #195). build runs
// inside the try, so a failure there counts as a failed send, not a crash.
// 'unknown' means no answer: the email may have gone out.
export async function sendEmail(tag: string, build: () => Promise<Email> | Email): Promise<'sent' | 'refused' | 'unknown'> {
  try {
    const res = await fetch(`${RESEND_API_BASE}/emails`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Lincoln from Cover Me <lincoln@cover-me.dev>', reply_to: 'lincoln@cover-me.dev', ...(await build()) }),
      // So one stuck send can't push a batch past the function time limit (#113).
      signal: AbortSignal.timeout(15_000),
    })
    if (res.ok) return 'sent'
    console.error(`[${tag}] Resend answered ${res.status}`)
    return 'refused'
  } catch (err) {
    console.error(`[${tag}] send failed:`, err instanceof Error ? err.message : 'unknown error')
    return 'unknown'
  }
}
