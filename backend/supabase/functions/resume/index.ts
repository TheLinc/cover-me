import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/cors.ts'
import { decrypt, encrypt, sameCiphertext } from '../_shared/encrypt.ts'
import { isValidParsedResume, parseResumeStructure, type ParsedResume } from '../_shared/resume-parse.ts'
import { readBody } from '../_shared/read-body.ts'

const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SECRET_KEY = Deno.env.get('SERVICE_KEY')!
const MAX_RESUME_BYTES    = 100_000 // 100 KB — well above any real resume text
// A Pro account's Word file for "Your design" (#131): 2 MB, sent as base64.
const MAX_DOCX_BYTES      = 2 * 1024 * 1024
const MAX_DOCX_BODY       = Math.ceil(MAX_DOCX_BYTES / 3) * 4 + 1_000
const SHA256_HEX          = /^[0-9a-f]{64}$/
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

  // POST ?file=1: a Pro account's Word file, for the dashboard's download in
  // the user's own design. Kept with the parse it was checked against.
  if (req.method === 'POST' && new URL(req.url).searchParams.has('file')) {
    const { data: account } = await supabase.from('users').select('tier').eq('id', userId).single()
    if (account?.tier !== 'hosted_pro') return json({ error: 'Keeping your Word file requires a Pro subscription.' }, 403)
    const raw = await readBody(req, MAX_DOCX_BODY)
    if (raw === null) return json({ error: 'Word file too large (max 2 MB)' }, 413)
    let hash: unknown, docx: unknown
    try {
      ({ hash, docx } = JSON.parse(raw))
    } catch {
      return json({ error: 'Invalid request body' }, 400)
    }
    if (typeof hash !== 'string' || !SHA256_HEX.test(hash)) return json({ error: 'Invalid hash' }, 400)
    if (typeof docx !== 'string' || !docx || !/^[A-Za-z0-9+/]+={0,2}$/.test(docx)) return json({ error: 'Invalid file' }, 400)

    const { data: resumeRow } = await supabase.from('resumes').select('structured_encrypted').eq('user_id', userId).maybeSingle()
    let docx_encrypted: string
    try {
      docx_encrypted = await encrypt(docx)
    } catch {
      return json({ error: 'Encryption failed' }, 500)
    }
    const { error } = await supabase.from('resume_files').upsert(
      { user_id: userId, hash, docx_encrypted, structured_encrypted: resumeRow?.structured_encrypted ?? null },
      { onConflict: 'user_id,hash' },
    )
    if (error) return json({ error: 'Failed to save Word file' }, 500)

    // Files no tailored resume was made from go, apart from this one.
    const { data: used } = await supabase.from('tailored_resumes').select('source_hash').eq('user_id', userId).not('source_hash', 'is', null)
    const keep = [...new Set([hash, ...(used ?? []).map((r) => r.source_hash as string)])]
    await supabase.from('resume_files').delete().eq('user_id', userId).not('hash', 'in', `(${keep.join(',')})`)
    return json({ success: true })
  }

  // POST — save/replace resume. parse: true waits for the parse and returns
  // it (the extension's check of a Word upload); otherwise it runs behind.
  if (req.method === 'POST') {
    // Reject oversized payloads before parsing JSON
    const contentLength = parseInt(req.headers.get('content-length') ?? '0', 10)
    if (contentLength > MAX_RESUME_BYTES) {
      return json({ error: 'Resume text too large (max 100 KB)' }, 413)
    }

    let text: string, filename: string | undefined, wantParse = false
    try {
      const body = await req.json()
      text = body.text
      filename = body.filename
      wantParse = body.parse === true
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
      .select('text_encrypted, structured_encrypted')
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
      if (!wantParse) return json({ success: true })
      const cached = await readParse(previous!.structured_encrypted)
      return json({ success: true, structured: cached ?? await parseNow(supabase, userId, text, previous!.text_encrypted) })
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

    if (wantParse) return json({ success: true, structured: await parseNow(supabase, userId, text, text_encrypted) })
    EdgeRuntime.waitUntil(parseNow(supabase, userId, text, text_encrypted))

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

// A cached parse, or null when it's missing, unreadable or from before otherSections.
async function readParse(encrypted: string | null): Promise<ParsedResume | null> {
  if (!encrypted) return null
  try {
    const decoded = JSON.parse(await decrypt(encrypted))
    return isValidParsedResume(decoded) && Array.isArray(decoded.otherSections) ? decoded : null
  } catch {
    return null
  }
}

// Parses the resume and caches it, the same way tailor does on first use.
// Only writes if the stored text is still the text it parsed. A failure, or
// an account over its parse limit, returns null and leaves the parse to tailor.
async function parseNow(supabase: SupabaseClient, userId: string, text: string, textEncrypted: string): Promise<ParsedResume | null> {
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
    if (error || !allowed) return null
    const structured = await parseResumeStructure(text, ANTHROPIC_API_KEY)
    const structured_encrypted = await encrypt(JSON.stringify(structured))
    const { error: saveError } = await supabase.from('resumes').update({ structured_encrypted })
      .eq('user_id', userId).like('text_encrypted', sameCiphertext(textEncrypted))
    if (saveError) console.error('Resume parse: saving it failed')
    return structured
  } catch {
    console.error('Resume parse failed')
    return null
  }
}
