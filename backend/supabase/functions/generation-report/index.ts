// "Flag a problem" (#256): one PostHog survey response per report. The survey's
// questions, in order: what was wrong, the comment, "Cover letter" or "Tailored resume".
// The extension takes the user's details out and shows them the report first; header
// fields arrive as tags, and anything else there is dropped in case it slips through.
// BYOK users report too, so verify_jwt is off and calls are limited per IP. A token is
// read only with "You can email me" (contact: true), to add the account ID. Never log
// the body. Without POSTHOG_GENERATION_SURVEY_ID a valid report succeeds and nothing is sent.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/cors.ts'
import { checkIpRateLimit } from '../_shared/ip-rate-limit.ts'
import { capture } from '../_shared/posthog.ts'
import { readBody } from '../_shared/read-body.ts'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SERVICE_KEY')!)
const SURVEY_ID = Deno.env.get('POSTHOG_GENERATION_SURVEY_ID') ?? ''

// One press per result, so a person stays far below these (#256).
const PER_MINUTE = 5
const PER_DAY = 30

// The uninstall survey's quality reasons, so the two can be compared (#256).
const CATEGORIES: Record<string, string> = {
  design: 'The design or layout looked wrong',
  generic: 'The wording sounded generic or not like me',
  invented: "It added things that aren't true",
  missing: 'It left out things that matter',
  other: 'Other',
}
const KINDS: Record<string, string> = { letter: 'Cover letter', resume: 'Tailored resume' }
// Header fields go as tags as long as the value, to render the report's header (#256).
const CONTACT_FIELDS = ['name', 'phone', 'email', 'website', 'links', 'location']
const TAG = /^(?:\[(?:name|email|phone|link|location)\]x*)?$/
const isTag = (v: unknown) => (Array.isArray(v) ? v.every(isTag) : typeof v === 'string' && TAG.test(v))

const HOST = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9-]{2,}$/
const VERSION = /^\d{1,5}(?:\.\d{1,5}){0,3}$/
const MAX_COMMENT = 500
const MAX_JOB_FIELD = 500
const MAX_DESCRIPTION = 15_000 // the most the prompts read (#256)
const MAX_LETTER = 20_000
const MAX_RESUME_JSON = 50_000
// The field caps add up to about 116,000 characters, which fit even as 3-byte
// text, and this is far under PostHog's 1 MB per event (#256).
const MAX_BYTES = 400_000

type Body = Record<string, unknown>

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // Validated before the rate limit, so a malformed body doesn't use it up (#256).
  let body: Body | null = null
  try {
    const text = await readBody(req, MAX_BYTES)
    if (text === null) return json({ error: 'Request too large' }, 413)
    body = JSON.parse(text)
  } catch { /* not JSON: rejected below (#256) */ }
  const properties = body && typeof body === 'object' ? report(body) : null
  if (!properties) return json({ error: 'Invalid request' }, 400)

  const limit = await checkIpRateLimit(supabase, req, 'generation-report', PER_MINUTE, PER_DAY)
  if (limit !== 'ok') return json({ error: limit === 'over' ? 'Too many requests' : 'Try again shortly' }, limit === 'over' ? 429 : 503)

  // After the limit, so bad tokens can't make unlimited auth lookups (#256).
  if (body!.contact === true) {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (token) {
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (error || !user) return json({ error: 'Invalid token' }, 401)
      properties.account_id = user.id
    }
  }

  if (!SURVEY_ID) return json({ ok: true })
  const sent = await capture('survey sent', crypto.randomUUID(), { $survey_id: SURVEY_ID, ...properties, $survey_completed: true })
  return sent ? json({ ok: true }) : json({ error: 'Could not send' }, 502)
})

const isText = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max
const isResume = (v: unknown): v is Body => !!v && typeof v === 'object' && !Array.isArray(v) && JSON.stringify(v).length <= MAX_RESUME_JSON
const withoutContact = (r: Body) => Object.fromEntries(Object.entries(r).filter(([k, v]) => k !== 'sourceHash' && (!CONTACT_FIELDS.includes(k) || isTag(v))))

function report({ category, comment, kind, output, job, mode, provider, version, sourceResume }: Body): Record<string, unknown> | null {
  if (typeof category !== 'string' || !Object.hasOwn(CATEGORIES, category)) return null
  if (!isText(comment, MAX_COMMENT) || (category === 'other' && !comment.trim())) return null
  if (typeof kind !== 'string' || !Object.hasOwn(KINDS, kind)) return null
  if (mode !== 'hosted' && mode !== 'byok') return null
  if (provider !== 'claude' && provider !== 'openai') return null
  if (typeof version !== 'string' || !VERSION.test(version)) return null
  if (!job || typeof job !== 'object') return null
  const { title, company, description, site } = job as Body
  if (!isText(title, MAX_JOB_FIELD) || !isText(company, MAX_JOB_FIELD) || !isText(description, MAX_DESCRIPTION)) return null
  if (typeof site !== 'string' || (site !== '' && !HOST.test(site))) return null
  if (sourceResume !== undefined && (category !== 'invented' || !isResume(sourceResume))) return null

  let made: Record<string, unknown>
  if (kind === 'letter') {
    if (typeof output !== 'string' || !output.trim() || output.length > MAX_LETTER) return null
    made = { output }
  } else {
    if (!isResume(output)) return null
    const resume = withoutContact(output)
    const gaps = Array.isArray(resume.atsGaps) && resume.atsGaps.every((g) => typeof g === 'string') ? resume.atsGaps : undefined
    made = {
      output: resume,
      ...(typeof resume.atsScore === 'number' && { ats_score: resume.atsScore }),
      ...(gaps && { ats_gaps: gaps }),
      edited: typeof resume.editedAt === 'string',
    }
  }

  return {
    $survey_response: CATEGORIES[category],
    $survey_response_1: comment.trim(),
    $survey_response_2: KINDS[kind],
    ...made,
    job_title: title,
    company,
    description,
    site,
    mode,
    provider,
    version,
    ...(sourceResume !== undefined && { source_resume: withoutContact(sourceResume as Body) }),
  }
}
