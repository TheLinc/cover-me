import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/cors.ts'
import { decrypt, encrypt } from '../_shared/encrypt.ts'
import { parseResumeStructure } from '../_shared/resume-parse.ts'

const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SECRET_KEY = Deno.env.get('SERVICE_KEY')!
const MAX_RESUME_BYTES    = 100_000 // 100 KB — well above any real resume text
const ANTHROPIC_API_KEY   = Deno.env.get('ANTHROPIC_API_KEY')!
// ponytail: an upload within this long of the previous one isn't parsed ahead
// (tailor parses it on first use, as before). Bounds the Haiku calls one
// account can cause by re-uploading; a per-day cap would allow more retries.
const PARSE_AGAIN_AFTER_MS = 60_000

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

    let text_encrypted: string
    try {
      text_encrypted = await encrypt(text)
    } catch {
      return json({ error: 'Encryption failed' }, 500)
    }

    const { data: previous } = await supabase
      .from('resumes')
      .select('text_encrypted, updated_at')
      .eq('user_id', userId)
      .maybeSingle()
    let sameText = false
    if (previous) {
      try { sameText = (await decrypt(previous.text_encrypted)) === text } catch { /* unreadable: treat as new */ }
    }

    // The same text again (a sign-in sync) keeps the parsed copy. New text
    // clears it, and the parse starts now so the first tailor doesn't wait for it.
    const updated_at = new Date().toISOString()
    const { error } = await supabase.from('resumes').upsert(
      {
        user_id: userId, text_encrypted, filename: safeFilename, updated_at,
        ...(sameText ? {} : { structured_encrypted: null }),
      },
      { onConflict: 'user_id' },
    )

    if (error) return json({ error: 'Failed to save resume' }, 500)

    const recent = previous && Date.now() - new Date(previous.updated_at).getTime() < PARSE_AGAIN_AFTER_MS
    if (!sameText && !recent) EdgeRuntime.waitUntil(parseAhead(supabase, userId, text, updated_at))

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
// on first use. Only writes if this upload is still the latest; a failure just
// leaves the parse to tailor.
async function parseAhead(supabase: ReturnType<typeof createClient>, userId: string, text: string, updatedAt: string) {
  try {
    const structured = await parseResumeStructure(text, ANTHROPIC_API_KEY)
    const structured_encrypted = await encrypt(JSON.stringify(structured))
    await supabase.from('resumes').update({ structured_encrypted }).eq('user_id', userId).eq('updated_at', updatedAt)
  } catch {
    console.error('Background resume parse failed')
  }
}
