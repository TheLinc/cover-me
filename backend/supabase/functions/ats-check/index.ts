// The website's free ATS checker (#278): POST { posting, resume } → { keywords }.
// No account, so verify_jwt is off in config.toml and calls are rate-limited per
// IP. The posting and resume go to Anthropic on the checker's own key and are
// never stored or logged, not even on failure (#278).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { ANTHROPIC_MESSAGES_URL } from '../_shared/anthropic.ts'
import { handleCors, json } from '../_shared/cors.ts'
import { checkIpRateLimit } from '../_shared/ip-rate-limit.ts'
import { readBody } from '../_shared/read-body.ts'
import { RESPONSE_SCHEMA, SYSTEM_PROMPT, userMessage } from './prompt.ts'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SERVICE_KEY')!)
const API_KEY = Deno.env.get('ANTHROPIC_CHECKER_API_KEY') ?? ''
const MODEL = 'claude-haiku-5-5'

const PER_MINUTE = 6
const PER_DAY = 40
// Across all IPs, so calls spread over many addresses still stop well short of
// the checker key's spend limit (#278).
const ALL_PER_MINUTE = 60
const ALL_PER_DAY = 3000
const MAX_CHARS = 30_000
const MAX_BYTES = 4 * 2 * MAX_CHARS
const MAX_KEYWORDS = 80
const MAX_NAME = 80

type Keyword = { name: string; level: 'required' | 'preferred'; posting_text: string; resume_text: string; found: boolean }

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body: { posting?: unknown; resume?: unknown } | null = null
  try {
    const text = await readBody(req, MAX_BYTES)
    if (text === null) return json({ error: 'Request too large' }, 413)
    body = JSON.parse(text)
  } catch {
    body = null
  }
  const { posting, resume } = body ?? {}
  if (!isText(posting) || !isText(resume)) return json({ error: 'Invalid request' }, 400)
  if (posting.length > MAX_CHARS || resume.length > MAX_CHARS) return json({ error: 'Text too long' }, 413)
  if (!API_KEY) return json({ error: 'Checker unavailable' }, 503)

  const limit = await checkIpRateLimit(supabase, req, 'ats-check', PER_MINUTE, PER_DAY)
  if (limit !== 'ok') return json({ error: limit === 'over' ? 'Too many requests' : 'Try again shortly' }, limit === 'over' ? 429 : 503)
  const all = await supabase.rpc('check_scrape_rate_limit', { p_ip_hash: 'ats-check:all', p_per_minute: ALL_PER_MINUTE, p_per_day: ALL_PER_DAY })
  if (all.error) return json({ error: 'Try again shortly' }, 503)
  if (all.data !== true) return json({ error: 'Too many requests' }, 429)

  let res: Response
  try {
    res = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: 'POST',
      headers: { 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: RESPONSE_SCHEMA } },
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage(posting, resume) }],
      }),
      signal: AbortSignal.timeout(60_000),
    })
  } catch (err) {
    console.error('ats-check: Anthropic request failed:', err instanceof Error ? err.name : 'unknown')
    return json({ error: 'Check failed' }, 502)
  }
  if (!res.ok) {
    console.error('ats-check: Anthropic status', res.status)
    return json({ error: 'Check failed' }, 502)
  }
  const data = await res.json() as { stop_reason?: string; content?: Array<{ type: string; text?: string }> }
  const keywords = data.stop_reason === 'end_turn' ? parseKeywords(data.content?.find((b) => b.type === 'text')?.text, posting, resume) : null
  if (!keywords) {
    console.error('ats-check: unusable reply, stop_reason', data.stop_reason)
    return json({ error: 'Check failed' }, 502)
  }
  return json({ keywords })
})

function isText(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

const plain = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase()

// Quotes are kept only when they're really in the text sent, so the reply
// can't carry anything else (#278).
function parseKeywords(text: string | undefined, posting: string, resume: string): Keyword[] | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text ?? '')
  } catch {
    return null
  }
  const list = (parsed as { keywords?: unknown })?.keywords
  if (!Array.isArray(list) || list.length > MAX_KEYWORDS) return null
  const valid = list.every((k) =>
    k && typeof k === 'object' &&
    ['name', 'posting_text', 'resume_text'].every((f) => typeof k[f] === 'string') &&
    k.name.trim() && (k.level === 'required' || k.level === 'preferred') && typeof k.found === 'boolean'
  )
  if (!valid) return null
  const [inPosting, inResume] = [plain(posting), plain(resume)]
  const quote = (q: string, source: string) => (plain(q) && source.includes(plain(q)) ? q : '')
  return list.map(({ name, level, posting_text, resume_text, found }) => ({
    name: name.slice(0, MAX_NAME),
    level,
    posting_text: quote(posting_text, inPosting),
    resume_text: found ? quote(resume_text, inResume) : '',
    found,
  }))
}
