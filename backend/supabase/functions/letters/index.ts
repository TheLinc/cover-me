import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/cors.ts'
import { decrypt, encrypt } from '../_shared/encrypt.ts'
import { findOrCreateJobApplication } from '../_shared/job-application.ts'
import { MAX_JOB_FIELD, MAX_LETTER_CHARS } from '../_shared/history-upload.ts'
import { MAX_BODY_BYTES, text } from '../_shared/job-input.ts'
import { readBody } from '../_shared/read-body.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SECRET_KEY = Deno.env.get('SERVICE_KEY')!

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return json({ error: 'Unauthorized' }, 401)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return json({ error: 'Invalid token' }, 401)

  const userId = user.id

  const { data: userData } = await supabase
    .from('users')
    .select('tier')
    .eq('id', userId)
    .single()

  if (userData?.tier !== 'hosted_pro') {
    return json({ error: 'History sync requires a Pro subscription.' }, 403)
  }

  const searchParams = new URL(req.url).searchParams
  const letterId = searchParams.get('id')

  if (req.method === 'GET') {
    const { data: rows, error } = await supabase
      .from('cover_letters')
      .select('id, letter_encrypted, created_at, job_applications(title, company, url)')
      .eq('user_id', userId)
      .eq('job_applications.user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
      .overrideTypes<{ job_applications: { title: string | null; company: string | null; url: string | null } | null }[]>()

    if (error) return json({ error: 'Failed to fetch history' }, 500)

    const letters: unknown[] = []
    for (const row of rows ?? []) {
      try {
        const letter = await decrypt(row.letter_encrypted)
        const ja = row.job_applications
        letters.push({
          id: row.id,
          job: { title: ja?.title ?? '', company: ja?.company ?? '', description: '', url: ja?.url ?? '' },
          letter,
          createdAt: row.created_at,
        })
      } catch {
        continue
      }
    }

    return json({ letters })
  }

  if (req.method === 'POST') {
    let body: {
      id: string
      job?: { title?: unknown; company?: unknown; url?: unknown }
      letter: unknown
      createdAt: string
    }
    try {
      const raw = await readBody(req, MAX_BODY_BYTES)
      if (raw === null) return json({ error: 'Request too large' }, 413)
      body = JSON.parse(raw)
    } catch {
      return json({ error: 'Invalid request body' }, 400)
    }

    if (!body?.id || typeof body.letter !== 'string' || !body.letter) return json({ error: 'Missing required fields' }, 400)
    if (body.letter.length > MAX_LETTER_CHARS) return json({ error: 'Letter too long' }, 400)

    // An ID another account holds must not be overwritten, nor leave an empty
    // job application in this one (#24).
    const { data: existing, error: lookupError } = await supabase.from('cover_letters').select('id').eq('id', body.id).maybeSingle()
    if (lookupError) return json({ error: 'Failed to save letter' }, 500)
    if (existing) return json({ success: true })

    let jobApplicationId: string
    try {
      jobApplicationId = await findOrCreateJobApplication(supabase, userId, {
        title: text(body.job?.title, MAX_JOB_FIELD),
        company: text(body.job?.company, MAX_JOB_FIELD),
        url: text(body.job?.url, MAX_JOB_FIELD),
      })
    } catch {
      return json({ error: 'Failed to resolve job application' }, 500)
    }

    const letter_encrypted = await encrypt(body.letter)

    const { error } = await supabase.from('cover_letters').upsert({
      id: body.id,
      user_id: userId,
      job_application_id: jobApplicationId,
      letter_encrypted,
      created_at: body.createdAt,
    }, { onConflict: 'id', ignoreDuplicates: true })

    if (error) return json({ error: 'Failed to save letter' }, 500)
    return json({ success: true })
  }

  if (req.method === 'DELETE') {
    if (!letterId) return json({ error: 'Missing id' }, 400)

    const { error } = await supabase
      .from('cover_letters')
      .delete()
      .eq('id', letterId)
      .eq('user_id', userId)

    if (error) return json({ error: 'Failed to delete letter' }, 500)
    return json({ success: true })
  }

  return json({ error: 'Method not allowed' }, 405)
})
