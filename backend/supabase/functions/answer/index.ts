// Answers to the written questions on job applications (#232), for a Cover Me
// account. The extension reads the question from the form; this writes the
// answer from the account's resume and the job, against the answer allowance
// (migration 032), which never uses up letters or resumes.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { consumeAnswer } from '../_shared/limits.ts'
import { ANTHROPIC_MESSAGES_URL, SONNET_BETA_HEADER, SONNET_FIELDS, SONNET_MAX_TOKENS } from '../_shared/anthropic.ts'
import { buildAnswerPrompt, finishAnswer, type AnswerRevision } from '../_shared/answer.ts'
import { handleCors, json } from '../_shared/cors.ts'
import { heartbeatJson } from '../_shared/heartbeat-json.ts'
import { decrypt } from '../_shared/encrypt.ts'
import { captureUsage } from '../_shared/posthog.ts'
import { MAX_BODY_BYTES, MAX_SUPPLEMENTAL, readJob, text } from '../_shared/job-input.ts'
import { readBody } from '../_shared/read-body.ts'

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void }

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SECRET_KEY = Deno.env.get('SERVICE_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

const FAILED = 'Could not write an answer. Please try again.'
const MAX_QUESTION = 2_000

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return json({ error: 'Unauthorized' }, 401)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return json({ error: 'Invalid token' }, 401)
  const userId = user.id

  let body
  let question: string
  let maxLength: number | undefined
  let supplemental: string | undefined
  let jobSource: 'page' | 'saved'
  let revision: AnswerRevision | undefined
  try {
    const raw = await readBody(req, MAX_BODY_BYTES)
    if (raw === null) return json({ error: 'Request too large' }, 413)
    body = JSON.parse(raw)
    question = text(body.question, MAX_QUESTION).trim()
    maxLength = Number.isInteger(body.maxLength) && body.maxLength > 0 ? body.maxLength : undefined
    supplemental = text(body.supplemental, MAX_SUPPLEMENTAL).trim() || undefined
    // Only a fixed value reaches PostHog (#235).
    jobSource = body.jobSource === 'saved' ? 'saved' : 'page'
    const r = body.revision
    if (r !== undefined) {
      if (typeof r?.previous !== 'string' || typeof r?.request !== 'string' || !r.previous.trim() || !r.request.trim()) {
        return json({ error: 'Invalid revision' }, 400)
      }
      revision = { previous: r.previous.slice(0, MAX_SUPPLEMENTAL), request: r.request.slice(0, MAX_QUESTION) }
    }
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  if (!question) return json({ error: 'Missing the question' }, 400)
  const job = readJob(body.job)
  if (!job) return json({ error: 'Missing job title or description' }, 400)

  const { data: resumeRow } = await supabase.from('resumes').select('text_encrypted').eq('user_id', userId).maybeSingle()
  if (!resumeRow) return json({ error: 'No resume found. Upload your resume in the extension first.' }, 400)
  let resumeText: string
  try {
    resumeText = await decrypt(resumeRow.text_encrypted)
  } catch {
    return json({ error: 'Failed to read resume. Please re-upload.' }, 500)
  }

  const { data: userRow } = await supabase.from('users').select('tier').eq('id', userId).single()
  const tier = userRow?.tier ?? 'hosted_free'

  // Charged only once the request is valid, so a bad request never costs an answer (#235).
  const today = new Date().toISOString().split('T')[0]
  const consumed = await consumeAnswer(supabase, userId)
  if (!consumed.ok) {
    if (consumed.allowance) EdgeRuntime.waitUntil(captureUsage(supabase, 'answer_limit_hit', userId, { tier, kind: consumed.allowance.kind }))
    return json(consumed.body, consumed.status)
  }
  // Only for a failed call to Anthropic: an empty or declined reply still costs
  // the answer (#358).
  const refund = async () => {
    const { error } = await supabase.rpc('refund_answer', { p_user_id: userId, p_date: today })
    if (error) console.error('Answer refund RPC error:', error.message)
  }

  const prompt = buildAnswerPrompt(job, resumeText, question, maxLength, supplemental, revision)

  return heartbeatJson('answer', FAILED, async () => {
    let answer: string
    try {
      answer = finishAnswer(await callClaude(prompt.context, prompt.question), maxLength)
    } catch (err) {
      console.error('Claude error:', err instanceof Error ? err.message : String(err))
      await refund()
      return { error: FAILED }
    }
    // A decline (stop_reason "refusal") comes back with no text (#235).
    if (!answer) return { error: FAILED }
    EdgeRuntime.waitUntil(captureUsage(supabase, 'answer_generated', userId, { tier, hasCharLimit: !!maxLength, jobSource, revised: !!revision }))
    const { data: allowance } = await supabase.rpc('answer_allowance', { p_user_id: userId })
    return { answer, allowance: allowance ?? undefined }
  })
})

// The instructions, posting and resume go first with a cache breakpoint: they
// repeat for every question on one application, and a cached read costs a
// fraction of a fresh one. The question comes after it (#235).
async function callClaude(context: string, question: string): Promise<string> {
  const res = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      ...SONNET_BETA_HEADER,
    },
    body: JSON.stringify({
      ...SONNET_FIELDS,
      max_tokens: SONNET_MAX_TOKENS,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: context, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: question },
        ],
      }],
    }),
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json() as { content: Array<{ type: string; text: string }> }
  return data.content.find((b) => b.type === 'text')?.text ?? ''
}
