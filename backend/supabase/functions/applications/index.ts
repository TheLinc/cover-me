import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/cors.ts'
import { decrypt, encrypt } from '../_shared/encrypt.ts'
import { findOrCreateJobApplication } from '../_shared/job-application.ts'
import { atsColumns, MAX_UPLOAD_BYTES, parseUpload } from '../_shared/history-upload.ts'
import { readBody } from '../_shared/read-body.ts'
import { likeContains, parseSearch } from '../_shared/application-search.ts'

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

  const params = new URL(req.url).searchParams
  const appId = params.get('id')

  // GET: job applications with nested artifacts, newest first; optional search, dates and paging (_shared/application-search.ts)
  if (req.method === 'GET') {
    const search = parseSearch(params)
    if ('error' in search) return json({ error: search.error }, 400)

    let query = supabase
      .from('job_applications')
      .select(`
        id, title, company, url, created_at,
        cover_letters(id, letter_encrypted, created_at),
        tailored_resumes(id, resume_json_encrypted, created_at)
      `)
      .eq('user_id', userId)
    for (const term of search.terms) query = query.ilike('search_text', likeContains(term))
    if (search.from) query = query.gte('created_at', search.from)
    if (search.to) query = query.lt('created_at', search.to)
    // ponytail: created_at alone as the cursor (to the microsecond). Two of one user's applications
    // in the same microsecond would page past one; use (created_at, id) if seen.
    if (search.before) query = query.lt('created_at', search.before)

    // One extra row tells us whether there's another page.
    const { data: found, error } = await query
      .order('created_at', { ascending: false })
      .limit(search.limit + 1)

    if (error) return json({ error: 'Failed to fetch applications' }, 500)
    const hasMore = (found?.length ?? 0) > search.limit
    const rows = (found ?? []).slice(0, search.limit)

    type RawCoverLetter = { id: string; letter_encrypted: string; created_at: string }
    type RawResume = { id: string; resume_json_encrypted: string; created_at: string }

    const applications = []
    for (const row of rows) {
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

    return json({ applications, hasMore })
  }

  // POST: save entries from the extension's local history under their local
  // IDs, or with check: true only report which the account already holds.
  // Never overwrites an existing row. Spec: 2026-10-13-local-history-upload-design.md
  if (req.method === 'POST') {
    const raw = await readBody(req, MAX_UPLOAD_BYTES)
    if (raw === null) return json({ error: 'Request too large' }, 400)
    let upload: ReturnType<typeof parseUpload>
    try {
      upload = parseUpload(JSON.parse(raw))
    } catch {
      return json({ error: 'Invalid request body' }, 400)
    }
    if ('error' in upload) return json({ error: upload.error }, 400)

    const failed: string[] = []
    if (!upload.check && upload.entries.length > 0) {
      // IDs that already exist, in any account, are skipped before a job
      // application is made for them: one that belongs to someone else must
      // not leave an empty application in this account.
      const existing = async (table: 'cover_letters' | 'tailored_resumes', ids: string[]) =>
        ids.length === 0 ? { data: [] as { id: string }[], error: null } : await supabase.from(table).select('id').in('id', ids)
      const [letterRows, tailoredRows] = await Promise.all([
        existing('cover_letters', upload.letterIds),
        existing('tailored_resumes', upload.tailoredIds),
      ])
      if (letterRows.error || tailoredRows.error) return json({ error: 'Failed to save applications' }, 500)
      const taken = new Set([...(letterRows.data ?? []), ...(tailoredRows.data ?? [])].map((r) => r.id))

      // ponytail: one entry at a time, no rate limit. Pro only, capped at 70
      // entries and 1 MB, no AI calls. Two uploads at once can still duplicate
      // an application with no URL, as letters and tailor already can.
      for (const e of upload.entries) {
        if (taken.has(e.id)) continue
        try {
          const jobApplicationId = await findOrCreateJobApplication(supabase, userId, e.job, e.createdAt)
          const row = { id: e.id, user_id: userId, job_application_id: jobApplicationId, created_at: e.createdAt }
          const { error } = e.kind === 'letter'
            ? await supabase.from('cover_letters').upsert(
              { ...row, letter_encrypted: await encrypt(e.letter) },
              { onConflict: 'id', ignoreDuplicates: true },
            )
            : await supabase.from('tailored_resumes').upsert(
              { ...row, resume_json_encrypted: await encrypt(JSON.stringify(e.resume)), ...atsColumns(e.resume) },
              { onConflict: 'id', ignoreDuplicates: true },
            )
          if (error) failed.push(e.id)
        } catch {
          failed.push(e.id)
        }
      }
    }

    // What this account holds now, read back so "saved" means saved.
    const owned = async (table: 'cover_letters' | 'tailored_resumes', ids: string[]): Promise<string[] | null> => {
      if (ids.length === 0) return []
      const { data, error } = await supabase.from(table).select('id').eq('user_id', userId).in('id', ids)
      return error ? null : (data ?? []).map((r) => r.id as string)
    }
    const [letters, tailored] = await Promise.all([owned('cover_letters', upload.letterIds), owned('tailored_resumes', upload.tailoredIds)])
    if (!letters || !tailored) return json({ error: 'Failed to read applications' }, 500)
    return json({ letters, tailored, failed })
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
