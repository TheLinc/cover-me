import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/cors.ts'
import { decrypt } from '../_shared/encrypt.ts'

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
    return json({ error: 'Application history requires a Pro subscription.' }, 403)
  }

  const appId = new URL(req.url).searchParams.get('id')

  // GET — fetch all job applications with nested artifacts
  if (req.method === 'GET') {
    const { data: rows, error } = await supabase
      .from('job_applications')
      .select(`
        id, title, company, url, created_at,
        cover_letters(id, letter_encrypted, created_at),
        tailored_resumes(id, resume_json_encrypted, created_at)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) return json({ error: 'Failed to fetch applications' }, 500)

    type RawCoverLetter = { id: string; letter_encrypted: string; created_at: string }
    type RawResume = { id: string; resume_json_encrypted: string; created_at: string }

    const applications = []
    for (const row of rows ?? []) {
      const coverLetters = []
      for (const cl of (row.cover_letters as RawCoverLetter[]) ?? []) {
        try {
          const letter = await decrypt(cl.letter_encrypted)
          coverLetters.push({ id: cl.id, letter, createdAt: cl.created_at })
        } catch { /* skip corrupt entries */ }
      }

      const tailoredResumes = []
      for (const tr of (row.tailored_resumes as RawResume[]) ?? []) {
        try {
          const json_str = await decrypt(tr.resume_json_encrypted)
          tailoredResumes.push({ id: tr.id, resume: JSON.parse(json_str), createdAt: tr.created_at })
        } catch { /* skip corrupt entries */ }
      }

      // Sort artifacts newest-first
      coverLetters.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      tailoredResumes.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

      applications.push({
        id: row.id,
        title: row.title ?? '',
        company: row.company ?? '',
        url: row.url ?? '',
        createdAt: row.created_at,
        coverLetters,
        tailoredResumes,
      })
    }

    return json({ applications })
  }

  // DELETE — remove a job application (cascades to cover_letters + tailored_resumes)
  if (req.method === 'DELETE') {
    if (!appId) return json({ error: 'Missing id' }, 400)

    const { error } = await supabase
      .from('job_applications')
      .delete()
      .eq('id', appId)
      .eq('user_id', userId)

    if (error) return json({ error: 'Failed to delete application' }, 500)
    return json({ success: true })
  }

  return json({ error: 'Method not allowed' }, 405)
})
