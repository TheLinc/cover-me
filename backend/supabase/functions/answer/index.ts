// Answers to the written questions on job applications (#232), for a Cover Me
// account. The extension reads the question from the form; this writes the
// answer from the account's resume and the job, against the answer allowance
// (migration 032), which never uses up letters or resumes.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { consumeAnswer } from '../_shared/limits.ts'
import { ANTHROPIC_MESSAGES_URL, SONNET_BETA_HEADER, SONNET_FIELDS, SONNET_MAX_TOKENS } from '../_shared/anthropic.ts'
import { buildAnswerPrompt, finishAnswer } from '../_shared/answer.ts'
import { handleCors, json } from '../_shared/cors.ts'
import { heartbeatJson } from '../_shared/heartbeat-json.ts'
import { decrypt } from '../_shared/encrypt.ts'
import { captureUsage } from '../_shared/posthog.ts'

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void }

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SECRET_KEY = Deno.env.get('SERVICE_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

const FAILED = 'Could not write an answer. Please try again.'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return json({ error: 'Unauthorized' }, 401)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return json({ error: 'Invalid token' }, 401)
  const userId = user.id

  let job: { title: string; company: string; description: string }
  let question: string
  let maxLength: number | undefined
  let supplemental: string | undefined
  let jobSource: 'page' | 'saved'
  try {
    const body = await req.json()
    job = body.job
    question = typeof body.question === 'string' ? body.question.trim() : ''
    maxLength = Number.isInteger(body.maxLength) && body.maxLength > 0 ? body.maxLength : undefined
    supplemental = typeof body.supplemental === 'string' ? body.supplemental.trim() || undefined : undefined
    // Only a fixed value reaches PostHog.
    jobSource = body.jobSource === 'saved' ? 'saved' : 'page'
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  if (!question) return json({ error: 'Missing the question' }, 400)
  // Checked as strings: the prompt is built after the answer is counted.
  if (typeof job?.title !== 'string' || typeof job.description !== 'string' || !job.title || !job.description) {
    return json({ error: 'Missing job title or description' }, 400)
  }
  if (typeof job.company !== 'string') job.company = ''

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

  // Charged only once the request is valid, so a bad request never costs an answer.
  const today = new Date().toISOString().split('T')[0]
  const consumed = await consumeAnswer(supabase, userId)
  if (!consumed.ok) {
    if (consumed.allowance) EdgeRuntime.waitUntil(captureUsage(supabase, 'answer_limit_hit', userId, { tier, kind: consumed.allowance.kind }))
    return json(consumed.body, consumed.status)
  }
  const refund = async () => {
    const { error } = await supabase.rpc('refund_answer', { p_user_id: userId, p_date: today })
    if (error) console.error('Answer refund RPC error:', error.message)
  }

  const prompt = buildAnswerPrompt(job, resumeText, question, maxLength, supplemental)

  return heartbeatJson('answer', FAILED, async () => {
    let answer: string
    try {
      answer = finishAnswer(await callClaude(prompt.context, prompt.question), maxLength)
    } catch (err) {
      console.error('Claude error:', err instanceof Error ? err.message : String(err))
      await refund()
      return { error: FAILED }
    }
    // A decline (stop_reason "refusal") comes back with no text.
    if (!answer) {
      await refund()
      return { error: FAILED }
    }
    // One count per answer, with fixed values only, unless the account opted out.
    EdgeRuntime.waitUntil(captureUsage(supabase, 'answer_generated', userId, { tier, hasCharLimit: !!maxLength, jobSource }))
    return { answer }
  })
})

// The instructions, posting and resume go first with a cache breakpoint: they
// repeat for every question on one application, and a cached read costs a
// fraction of a fresh one. The question comes after it.
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
