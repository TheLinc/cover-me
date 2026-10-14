import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/cors.ts'
import { decrypt, encrypt } from '../_shared/encrypt.ts'
import { parseResumeStructure } from '../_shared/resume-parse.ts'

const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SECRET_KEY = Deno.env.get('SERVICE_KEY')!
const MAX_RESUME_BYTES    = 100_000 // 100 KB — well above any real resume text
const ANTHROPIC_API_KEY   = Deno.env.get('ANTHROPIC_API_KEY')!
// Background parses per account. Uploads aren't charged like generations,
// so this bounds the Haiku calls one account can cause by re-uploading (or
// deleting and re-uploading). Past it, tailor parses on first use, as before.
const PARSES_PER_MINUTE = 2
const PARSES_PER_DAY    = 10

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void }

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return json({ error: 'Unauthorized' }, 401)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return json({ error: 'Invalid token' }, 401)

  const userId = user.id

  // GET — fetch resume text
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('resumes')
      .select('text_encrypted, filename, updated_at')
      .eq('user_id', userId)
      .single()

    if (error || !data) return json({ error: 'No resume found' }, 404)

    try {
      const text = await decrypt(data.text_encrypted)
      return json({ text, filename: data.filename, updated_at: data.updated_at })
    } catch {
      return json({ error: 'Failed to decrypt resume' }, 500)
    }
  }

  // POST — save/replace resume
  if (req.method === 'POST') {
    // Reject oversized payloads before parsing JSON
    const contentLength = parseInt(req.headers.get('content-length') ?? '0', 10)
    if (contentLength > MAX_RESUME_BYTES) {
      return json({ error: 'Resume text too large (max 100 KB)' }, 413)
    }

    let text: string, filename: string | undefined
    try {
      const body = await req.json()
      text = body.text
      filename = body.filename
    } catch {
      return json({ error: 'Invalid request body' }, 400)
    }

    if (!text || typeof text !== 'string') return json({ error: 'Missing text' }, 400)
    if (text.length > MAX_RESUME_BYTES) {
      return json({ error: 'Resume text too large (max 100 KB)' }, 413)
    }
    if (filename && typeof filename !== 'string') {
      return json({ error: 'Invalid filename' }, 400)
    }
    // Strip any non-printable characters from filename
    const safeFilename = filename?.replace(/[^\x20-\x7E]/g, '').slice(0, 255) ?? null

    const { data: previous } = await supabase
      .from('resumes')
      .select('text_encrypted')
      .eq('user_id', userId)
      .maybeSingle()
    let sameText = false
    if (previous) {
      try { sameText = (await decrypt(previous.text_encrypted)) === text } catch { /* unreadable: treat as new */ }
    }
    const updated_at = new Date().toISOString()

    // The same text again (a sign-in sync) leaves the stored text and its
    // parsed copy alone, so a parse still running for it can save its result.
    if (sameText) {
      const { error } = await supabase.from('resumes').update({ filename: safeFilename, updated_at }).eq('user_id', userId)
      if (error) return json({ error: 'Failed to save resume' }, 500)
      return json({ success: true })
    }

    let text_encrypted: string
    try {
      text_encrypted = await encrypt(text)
    } catch {
      return json({ error: 'Encryption failed' }, 500)
    }

    // New text clears the parsed copy, and the parse starts now so the first
    // tailor doesn't wait for it.
    const { error } = await supabase.from('resumes').upsert(
      { user_id: userId, text_encrypted, filename: safeFilename, updated_at, structured_encrypted: null },
      { onConflict: 'user_id' },
    )

    if (error) return json({ error: 'Failed to save resume' }, 500)

    EdgeRuntime.waitUntil(parseAhead(supabase, userId, text, text_encrypted))

    return json({ success: true })
  }

  // DELETE — remove resume
  if (req.method === 'DELETE') {
    const { error } = await supabase.from('resumes').delete().eq('user_id', userId)
    if (error) return json({ error: 'Failed to delete resume' }, 500)
    return json({ success: true })
  }

  return json({ error: 'Method not allowed' }, 405)
})

// Parses the resume in the background and caches it, the same way tailor does
// on first use. Only writes if the stored text is still the text it parsed; a failure, or
// an account over its parse limit, just leaves the parse to tailor.
async function parseAhead(supabase: ReturnType<typeof createClient>, userId: string, text: string, textEncrypted: string) {
  try {
    // The scrape limiter's counter, keyed by a hash of the account instead of
    // the IP (the table holds only 64-character hex keys).
    const key = new TextEncoder().encode(`resume-parse:${userId}`)
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', key))
    const { data: allowed, error } = await supabase.rpc('check_scrape_rate_limit', {
      p_ip_hash: Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join(''),
      p_per_minute: PARSES_PER_MINUTE,
      p_per_day: PARSES_PER_DAY,
    })
    if (error || !allowed) return
    const structured = await parseResumeStructure(text, ANTHROPIC_API_KEY)
    const structured_encrypted = await encrypt(JSON.stringify(structured))
    await supabase.from('resumes').update({ structured_encrypted }).eq('user_id', userId).eq('text_encrypted', textEncrypted)
  } catch {
    console.error('Background resume parse failed')
  }
}
