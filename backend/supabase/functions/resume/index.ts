import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/cors.ts'
import { decrypt, encrypt } from '../_shared/encrypt.ts'

const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SECRET_KEY = Deno.env.get('SERVICE_KEY')!
const MAX_RESUME_BYTES    = 100_000 // 100 KB — well above any real resume text

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

    // structured_encrypted: null — invalidate the cached AI-parsed structure;
    // the tailor function re-parses (and re-caches) from the new text.
    const { error } = await supabase.from('resumes').upsert(
      { user_id: userId, text_encrypted, filename: safeFilename, structured_encrypted: null, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )

    if (error) return json({ error: 'Failed to save resume' }, 500)

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
