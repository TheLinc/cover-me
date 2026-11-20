// The website's free ATS checker (#278): POST { posting, resume, token } →
// { score, gaps, keywordMatch, quotes, title }, scored like the extension's tailor.
// No account, so verify_jwt is off in config.toml and calls are rate-limited per
// IP. The posting and resume go to Anthropic on the checker's own key and are
// never stored or logged, not even on failure (#278).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { ANTHROPIC_MESSAGES_URL } from '../_shared/anthropic.ts'
import { handleCors, json } from '../_shared/cors.ts'
import { checkIpRateLimit } from '../_shared/ip-rate-limit.ts'
import { scoreFromMatch } from '../_shared/ats-score.ts'
import { readBody } from '../_shared/read-body.ts'
import { RESPONSE_SCHEMA, SYSTEM_PROMPT, userMessage } from './prompt.ts'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SERVICE_KEY')!)
const API_KEY = Deno.env.get('ANTHROPIC_CHECKER_API_KEY') ?? ''
const MODEL = 'claude-haiku-5-5'
// Unset on self-hosted backends, which then skip the bot check (#278).
const TURNSTILE_SECRET = Deno.env.get('TURNSTILE_SECRET_KEY') ?? ''
const SITEVERIFY_URL = Deno.env.get('TURNSTILE_VERIFY_URL') || 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
// A token passes only for the checker's action, from a page on these hosts. localhost
// belongs in the local env only (https://developers.cloudflare.com/turnstile/spin/prompt.md).
const TURNSTILE_HOSTNAMES = (Deno.env.get('TURNSTILE_HOSTNAMES') || 'cover-me.dev,www.cover-me.dev').split(',').map((h) => h.trim()).filter(Boolean)
const TURNSTILE_ACTION = 'ats-check'

const PER_MINUTE = 6
const PER_DAY = 40
// Across all IPs, so calls spread over many addresses still stop well short of
// the checker key's spend limit (#278).
const ALL_PER_MINUTE = 60
const ALL_PER_DAY = 3000
// Hashed like an IP key, so every row in the rate-limit table stays a 64-character hash (#278).
const ALL_KEY = crypto.subtle.digest('SHA-256', new TextEncoder().encode('ats-check:all'))
  .then((d) => Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join(''))
const MAX_CHARS = 30_000
const MAX_BYTES = 4 * 2 * MAX_CHARS
const MAX_KEYWORDS = 80
const MAX_NAME = 80
const MAX_GATES = 10

type Keyword = { name: string; tier: 1 | 2; posting_text: string; resume_text: string; covered: boolean }
type Report = { keywords: Keyword[]; gatingGaps: string[]; title: string }

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body: { posting?: unknown; resume?: unknown; token?: unknown } | null = null
  try {
    const text = await readBody(req, MAX_BYTES)
    if (text === null) return json({ error: 'Request too large' }, 413)
    body = JSON.parse(text)
  } catch {
    body = null
  }
  const { posting, resume, token } = body ?? {}
  if (!isText(posting) || !isText(resume)) return json({ error: 'Invalid request' }, 400)
  if (posting.length > MAX_CHARS || resume.length > MAX_CHARS) return json({ error: 'Text too long' }, 413)
  if (!API_KEY) return json({ error: 'Checker unavailable' }, 503)
  if (TURNSTILE_SECRET && !(await passesBotCheck(token, req))) return json({ error: 'Bot check failed' }, 403)

  const limit = await checkIpRateLimit(supabase, req, 'ats-check', PER_MINUTE, PER_DAY)
  if (limit !== 'ok') return json({ error: limit === 'over' ? 'Too many requests' : 'Try again shortly' }, limit === 'over' ? 429 : 503)
  const all = await supabase.rpc('check_scrape_rate_limit', { p_ip_hash: await ALL_KEY, p_per_minute: ALL_PER_MINUTE, p_per_day: ALL_PER_DAY })
  if (all.error) return json({ error: 'Try again shortly' }, 503)
  if (all.data !== true) return json({ error: 'Checker busy' }, 503)

  let data: { stop_reason?: string; content?: Array<{ type: string; text?: string }> }
  try {
    const res = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: 'POST',
      headers: { 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 16000,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: RESPONSE_SCHEMA } },
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage(posting, resume) }],
      }),
      signal: AbortSignal.timeout(60_000),
    })
    if (!res.ok) {
      console.error('ats-check: Anthropic status', res.status)
      return json({ error: 'Check failed' }, 502)
    }
    data = await res.json()
  } catch (err) {
    console.error('ats-check: Anthropic request failed:', err instanceof Error ? err.name : 'unknown')
    return json({ error: 'Check failed' }, 502)
  }
  const report = data.stop_reason === 'end_turn' ? parseReport(data.content?.find((b) => b.type === 'text')?.text, posting, resume) : null
  if (!report) {
    console.error('ats-check: unusable reply, stop_reason', data.stop_reason)
    return json({ error: 'Check failed' }, 502)
  }
  const names = (tier: 1 | 2, covered: boolean) => report.keywords.filter((k) => k.tier === tier && k.covered === covered).map((k) => k.name)
  const keywordMatch = { tier1Covered: names(1, true), tier1Missing: names(1, false), tier2Covered: names(2, true), tier2Missing: names(2, false), gatingGaps: report.gatingGaps }
  const { score, gaps } = scoreFromMatch(keywordMatch, { jobDescription: posting, candidate: resume })
  const quotes = report.keywords.map(({ name, posting_text, resume_text }) => ({ name, posting_text, resume_text }))
  return json({ score, gaps, keywordMatch, quotes, title: report.title })
})

async function passesBotCheck(token: unknown, req: Request): Promise<boolean> {
  if (typeof token !== 'string' || !token || token.length > 2048) return false
  const form = new URLSearchParams({ secret: TURNSTILE_SECRET, response: token })
  const ip = req.headers.get('cf-connecting-ip')
  if (ip) form.set('remoteip', ip)
  try {
    const res = await fetch(SITEVERIFY_URL, { method: 'POST', body: form, signal: AbortSignal.timeout(10_000) })
    const result = await res.json() as { success?: boolean; action?: string; hostname?: string; 'error-codes'?: string[] }
    const ok = result.success === true && result.action === TURNSTILE_ACTION && TURNSTILE_HOSTNAMES.includes(result.hostname ?? '')
    if (!ok) console.warn('ats-check: bot check failed:', result['error-codes']?.join(',') || `action ${result.action}, host ${result.hostname}`)
    return ok
  } catch (err) {
    console.error('ats-check: bot check request failed:', err instanceof Error ? err.name : 'unknown')
    return false
  }
}

function isText(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

const plain = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase()

// Quotes and the title are kept only when they're really in the text sent, so
// the only free model text left is names and gaps, capped at MAX_NAME (#278).
function parseReport(text: string | undefined, posting: string, resume: string): Report | null {
  let parsed: { keywords?: unknown; gatingGaps?: unknown; job_title?: unknown }
  try {
    parsed = JSON.parse(text ?? '')
  } catch {
    return null
  }
  const { keywords: list, gatingGaps: gates, job_title: title } = parsed ?? {}
  if (!Array.isArray(list) || list.length > MAX_KEYWORDS || !Array.isArray(gates) || gates.length > MAX_GATES) return null
  const valid = list.every((k) =>
    k && typeof k === 'object' &&
    ['name', 'posting_text', 'resume_text'].every((f) => typeof k[f] === 'string') &&
    k.name.trim() && (k.tier === 1 || k.tier === 2) && typeof k.covered === 'boolean'
  ) && gates.every((g) => typeof g === 'string') && typeof title === 'string'
  if (!valid) return null
  const [inPosting, inResume] = [plain(posting), plain(resume)]
  const quote = (q: string, source: string) => (plain(q) && source.includes(plain(q)) ? q : '')
  return {
    keywords: list.map(({ name, tier, posting_text, resume_text, covered }) => ({
      name: name.slice(0, MAX_NAME),
      tier,
      posting_text: quote(posting_text, inPosting),
      resume_text: covered ? quote(resume_text, inResume) : '',
      covered,
    })),
    gatingGaps: gates.map((g: string) => g.slice(0, MAX_NAME)).filter((g: string) => g.trim()),
    title: quote(title, inPosting).slice(0, MAX_NAME),
  }
}
