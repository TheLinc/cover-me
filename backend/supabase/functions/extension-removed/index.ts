// The uninstall page (web/app/uninstalled) calls this on load when its address
// carries an account id, so the follow-up email skips that account (#126):
//   POST { account_id }   sets users.extension_removed_at
// Signing in to the extension again clears it (the resume function).
//
// No sign-in: the extension is already gone when the page opens, so verify_jwt
// is off in config.toml and calls are rate-limited per IP. Anyone who knows an
// account id can stop its follow-up email; account ids aren't public and the
// only harm is a missed email (decided 2026-11-05). The answer is the same
// whether or not the account exists.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/cors.ts'
import { checkIpRateLimit } from '../_shared/ip-rate-limit.ts'
import { readBody } from '../_shared/read-body.ts'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SERVICE_KEY')!)

// A person removes the extension once, so they stay far below these.
const PER_MINUTE = 5
const PER_DAY = 30

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// A valid body is about 55 bytes; reading stops past this.
const MAX_BYTES = 1_000

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // Validated before the rate limit, so a malformed body doesn't use it up.
  let accountId: unknown
  try {
    const text = await readBody(req, MAX_BYTES)
    if (text === null) return json({ error: 'Request too large' }, 413)
    accountId = (JSON.parse(text) as { account_id?: unknown })?.account_id
  } catch { /* not JSON: rejected below */ }
  if (typeof accountId !== 'string' || !UUID.test(accountId)) return json({ error: 'Invalid request' }, 400)

  const limit = await checkIpRateLimit(supabase, req, 'extension-removed', PER_MINUTE, PER_DAY)
  if (limit !== 'ok') return json({ error: limit === 'over' ? 'Too many requests' : 'Try again shortly' }, limit === 'over' ? 429 : 503)

  const { error } = await supabase.from('users').update({ extension_removed_at: new Date().toISOString() }).eq('id', accountId)
  if (error) {
    console.error('extension-removed: update failed:', error.message)
    return json({ error: 'Try again shortly' }, 503)
  }
  return json({ ok: true })
})
