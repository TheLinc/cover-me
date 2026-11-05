import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, handleCors, json } from '../_shared/cors.ts'
import { verifyUnsubscribeToken } from '../_shared/email-consent.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SECRET_KEY = Deno.env.get('SERVICE_KEY')!
const SITE_URL = (Deno.env.get('SITE_URL') || 'https://www.cover-me.dev').replace(/\/+$/, '')
// How long after the account is created a Google signup's box is accepted.
const SIGNUP_WINDOW_MS = 10 * 60_000

// Email consent (#114). Two ways in:
//   ?token=… (the unsubscribe link, no sign-in):
//     GET  redirects to the site's /unsubscribe page, which POSTs back. Link
//          scanners open every GET, so a GET changes nothing.
//     POST unsubscribes: product updates off, and every non-account email
//          blocked (email_unsubscribed_at). Also the one-click target in the
//          List-Unsubscribe header.
//   The user's token (dashboard toggle, the signup box on a Google signup):
//     PATCH { product_updates: boolean, source: 'signup' | 'dashboard' }
// The dashboard reads the current value from its own users row.
Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)
  const unsubscribe = new URL(req.url).searchParams.get('token')

  if (unsubscribe !== null) {
    if (req.method === 'GET') {
      return new Response(null, { status: 303, headers: { ...corsHeaders, Location: `${SITE_URL}/unsubscribe?token=${encodeURIComponent(unsubscribe)}` } })
    }
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    let userId: string | null
    try {
      userId = await verifyUnsubscribeToken(unsubscribe)
    } catch (err) {
      console.error('[email-preferences]', err instanceof Error ? err.message : 'unknown error')
      return json({ error: "Unsubscribing isn't working right now. Please try again later." }, 503)
    }
    if (!userId) return json({ error: 'This unsubscribe link is invalid.' }, 400)
    const now = new Date().toISOString()
    const { error } = await supabase.from('users').update({
      product_updates: false,
      product_updates_changed_at: now,
      product_updates_source: 'unsubscribe',
      email_unsubscribed_at: now,
    }).eq('id', userId)
    if (error) return json({ error: 'Could not unsubscribe. Please try again.' }, 500)
    return json({ unsubscribed: true })
  }

  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return json({ error: 'Unauthorized' }, 401)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return json({ error: 'Invalid token' }, 401)

  if (req.method !== 'PATCH') return json({ error: 'Method not allowed' }, 405)

  const { product_updates, source } = await req.json().catch(() => ({})) as { product_updates?: unknown; source?: unknown }
  if (typeof product_updates !== 'boolean') return json({ error: 'product_updates must be true or false' }, 400)
  if (source !== 'signup' && source !== 'dashboard') return json({ error: 'Unknown source' }, 400)

  // A signup choice comes right after a Google signup. Later, the dashboard
  // is the way in, so a replayed signup request can't forge consent.
  if (source === 'signup') {
    const { data: row } = await supabase.from('users').select('created_at').eq('id', user.id).single()
    if (!row || Date.now() - Date.parse(row.created_at as string) > SIGNUP_WINDOW_MS) {
      return json({ error: 'Choose this from your dashboard.' }, 400)
    }
  }

  const { error } = await supabase.from('users').update({
    product_updates,
    product_updates_changed_at: new Date().toISOString(),
    product_updates_source: source,
    // Opting back in is consent again, so it lifts an earlier unsubscribe.
    ...(product_updates ? { email_unsubscribed_at: null } : {}),
  }).eq('id', user.id)
  if (error) return json({ error: 'Could not save your choice. Please try again.' }, 500)
  return json({ product_updates })
})
