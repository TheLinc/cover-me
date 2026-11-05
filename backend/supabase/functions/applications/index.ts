import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/cors.ts'
import { decrypt, encrypt } from '../_shared/encrypt.ts'
import { findOrCreateJobApplication } from '../_shared/job-application.ts'
import { atsColumns, isObject, isUuid, MAX_RESUME_JSON, MAX_UPLOAD_BYTES, parseUpload } from '../_shared/history-upload.ts'
import { readBody } from '../_shared/read-body.ts'
import { isStage, likeContains, parseSearch, type Stage } from '../_shared/application-search.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SECRET_KEY = Deno.env.get('SERVICE_KEY')!

const FULL_SELECT = `
  id, title, company, url, created_at, stage, stage_changed_at,
  cover_letters(id, letter_encrypted, created_at),
  tailored_resumes(id, resume_json_encrypted, created_at)
`
// What a card shows. Nothing to decrypt: the ATS score and gaps are plain columns.
const SUMMARY_SELECT = `
  id, title, company, url, created_at, stage, stage_changed_at,
  cover_letters(id, created_at),
  tailored_resumes(id, created_at, ats_score, ats_gaps, edited_at)
`

type Row = {
  id: string
  title: string | null
  company: string | null
  url: string | null
  created_at: string
  stage: Stage
  stage_changed_at: string | null
  cover_letters: Record<string, unknown>[] | null
  tailored_resumes: Record<string, unknown>[] | null
}

const newestFirst = (a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt)

const base = (row: Row) => ({
  id: row.id,
  title: row.title ?? '',
  company: row.company ?? '',
  url: row.url ?? '',
  createdAt: row.created_at,
  stage: row.stage,
  stageChangedAt: row.stage_changed_at,
})

async function fullApplication(row: Row) {
  const coverLetters = []
  for (const cl of row.cover_letters ?? []) {
    try {
      coverLetters.push({ id: cl.id as string, letter: await decrypt(cl.letter_encrypted as string), createdAt: cl.created_at as string })
    } catch { /* skip corrupt entries */ }
  }
  const tailoredResumes = []
  for (const tr of row.tailored_resumes ?? []) {
    try {
      tailoredResumes.push({ id: tr.id as string, resume: JSON.parse(await decrypt(tr.resume_json_encrypted as string)), createdAt: tr.created_at as string })
    } catch { /* skip corrupt entries */ }
  }
  return { ...base(row), coverLetters: coverLetters.sort(newestFirst), tailoredResumes: tailoredResumes.sort(newestFirst) }
}

function summaryApplication(row: Row) {
  return {
    ...base(row),
    coverLetters: (row.cover_letters ?? [])
      .map((cl) => ({ id: cl.id as string, createdAt: cl.created_at as string }))
      .sort(newestFirst),
    tailoredResumes: (row.tailored_resumes ?? [])
      .map((tr) => ({
        id: tr.id as string,
        createdAt: tr.created_at as string,
        atsScore: (tr.ats_score as number | null) ?? null,
        atsGaps: (tr.ats_gaps as string[] | null) ?? null,
        editedAt: (tr.edited_at as string | null) ?? null,
      }))
      .sort(newestFirst),
  }
}

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

  // Every account tracks its jobs: summaries, stages, deletes. What carries
  // the letters and resumes themselves (the full list, one application in
  // full, the upload) is Pro. The extension's history reads the full list,
  // so a free account there still gets 403, as before.
  const isPro = userData?.tier === 'hosted_pro'
  const proOnly = () => json({ error: 'Application history requires a Pro subscription.' }, 403)

  const params = new URL(req.url).searchParams
  const appId = params.get('id')

  // GET: job applications, newest first; optional search, dates, paging and
  // the stage filter (_shared/application-search.ts). summary=1 is what a
  // dashboard card shows; detail=<id> is one application in full.
  if (req.method === 'GET') {
    const detailId = params.get('detail')
    if (detailId !== null) {
      if (!isPro) return proOnly()
      if (!isUuid(detailId)) return json({ error: 'Invalid id' }, 400)
      const { data: row, error } = await supabase
        .from('job_applications')
        .select(FULL_SELECT)
        .eq('id', detailId)
        .eq('user_id', userId)
        .maybeSingle()
      if (error) return json({ error: 'Failed to fetch application' }, 500)
      if (!row) return json({ error: 'Not found' }, 404)
      return json({ application: await fullApplication(row as unknown as Row) })
    }

    const search = parseSearch(params)
    if ('error' in search) return json({ error: search.error }, 400)
    if (!search.summary && !isPro) return proOnly()

    let query = supabase
      .from('job_applications')
      .select(search.summary ? SUMMARY_SELECT : FULL_SELECT)
      .eq('user_id', userId)
    for (const term of search.terms) query = query.ilike('search_text', likeContains(term))
    if (search.from) query = query.gte('created_at', search.from)
    if (search.to) query = query.lt('created_at', search.to)
    if (search.stages.length > 0) query = query.in('stage', search.stages)
    // The full list is the extension's history, which lists documents. A job
    // with none here (tracked while free, #101) would sit there empty beside
    // the browser's copy of the same letter.
    if (!search.summary) query = query.or('cover_letters.not.is.null,tailored_resumes.not.is.null')
    // ponytail: created_at alone as the cursor (to the microsecond). Two of one user's applications
    // in the same microsecond would page past one; use (created_at, id) if seen.
    if (search.before) query = query.lt('created_at', search.before)

    // One extra row tells us whether there's another page.
    const { data: found, error } = await query
      .order('created_at', { ascending: false })
      .limit(search.limit + 1)

    if (error) return json({ error: 'Failed to fetch applications' }, 500)
    const hasMore = (found?.length ?? 0) > search.limit
    const rows = ((found ?? []) as unknown as Row[]).slice(0, search.limit)
    const applications = search.summary ? rows.map(summaryApplication) : await Promise.all(rows.map(fullApplication))
    return json({ applications, hasMore })
  }

  // PATCH ?resume=: the extension's editor tab overwrites one of the caller's
  // tailored resumes (#118). The ATS score stays from before the edit; the
  // gaps come as the editor left them, and edited_at drives the "Scored
  // before your edits" label.
  const resumeId = params.get('resume')
  if (req.method === 'PATCH' && resumeId !== null) {
    if (!isPro) return proOnly()
    if (!isUuid(resumeId)) return json({ error: 'Invalid id' }, 400)
    const raw = await readBody(req, MAX_RESUME_JSON + 1024)
    if (raw === null) return json({ error: 'Request too large' }, 400)
    let resume: unknown
    try {
      resume = (JSON.parse(raw) as { resume?: unknown } | null)?.resume
    } catch {
      return json({ error: 'Invalid request body' }, 400)
    }
    if (!isObject(resume) || JSON.stringify(resume).length > MAX_RESUME_JSON) return json({ error: 'Invalid resume' }, 400)
    const { data, error } = await supabase
      .from('tailored_resumes')
      .update({
        resume_json_encrypted: await encrypt(JSON.stringify(resume)),
        ...atsColumns(resume),
        edited_at: new Date().toISOString(),
      })
      .eq('id', resumeId)
      .eq('user_id', userId)
      .select('edited_at')
      .maybeSingle()
    if (error) return json({ error: 'Failed to update resume' }, 500)
    if (!data) return json({ error: 'Not found' }, 404)
    return json({ editedAt: data.edited_at })
  }

  // PATCH ?id=: move the caller's own application to another stage.
  if (req.method === 'PATCH') {
    if (!isUuid(appId)) return json({ error: 'Invalid id' }, 400)
    // { stage: 'offer' } is a few bytes; anything past 1 KB isn't this request.
    const raw = await readBody(req, 1024)
    if (raw === null) return json({ error: 'Request too large' }, 400)
    let body: unknown
    try {
      body = JSON.parse(raw)
    } catch {
      return json({ error: 'Invalid request body' }, 400)
    }
    const stage = (body as { stage?: unknown } | null)?.stage
    if (!isStage(stage)) return json({ error: 'Invalid request body' }, 400)
    const { data, error } = await supabase
      .from('job_applications')
      .update({ stage, stage_changed_at: new Date().toISOString() })
      .eq('id', appId)
      .eq('user_id', userId)
      .select('stage, stage_changed_at')
      .maybeSingle()
    if (error) return json({ error: 'Failed to update application' }, 500)
    if (!data) return json({ error: 'Not found' }, 404)
    return json({ stage: data.stage, stageChangedAt: data.stage_changed_at })
  }

  // POST: save entries from the extension's local history under their local
  // IDs, or with check: true only report which the account already holds.
  // Never overwrites an existing row. Spec: 2026-10-13-local-history-upload-design.md
  if (req.method === 'POST') {
    if (!isPro) return proOnly()
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
    if (!isUuid(appId)) return json({ error: 'Invalid id' }, 400)

    const { data, error } = await supabase
      .from('job_applications')
      .delete()
      .eq('id', appId)
      .eq('user_id', userId)
      .select('id')

    if (error) return json({ error: 'Failed to delete application' }, 500)
    // Nothing of yours had that id (already deleted, or someone else's).
    if (!data || data.length === 0) return json({ error: 'Not found' }, 404)
    return json({ success: true })
  }

  return json({ error: 'Method not allowed' }, 405)
})
