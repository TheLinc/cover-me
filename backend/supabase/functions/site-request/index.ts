// The extension's "Request this site" and "Report bug" buttons (#130). Each
// press sends one response to a PostHog survey in API mode:
//   POST { kind: 'site', host }                          a site to support
//   POST { kind: 'bug', url, scraper, error, version }   a supported board that failed
// The survey's questions, in order: type ("Site request" or "Bug report"),
// site (a hostname) and page URL (bug reports only). The scraper, error and
// version go with a bug report as event properties.
//
// Under the thanks line, a signed-in user can tick "Email me when Cover Me
// reads this site" (#195):
//   POST { kind: 'watch', host, watch }   with the user's token; watch: false takes it back
// That goes to the site_watch table (migration 034), never to PostHog.
//
// No account needed (BYOK users press them too), so verify_jwt is off in
// config.toml and calls are rate-limited per IP. Each response gets a random
// distinct_id: it is never linked to a person. Never log the URL or the error.
// Without POSTHOG_KEY or POSTHOG_SITE_SURVEY_ID (self-hosted backends), a valid
// request succeeds and nothing is sent.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/cors.ts'
import { checkIpRateLimit } from '../_shared/ip-rate-limit.ts'
import { capture } from '../_shared/posthog.ts'
import { readBody } from '../_shared/read-body.ts'
import { SCRAPER_NAMES } from '../_shared/scrapers/index.ts'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SERVICE_KEY')!)
const SURVEY_ID = Deno.env.get('POSTHOG_SITE_SURVEY_ID') ?? ''

// A person presses once per screen, far below these limits (#130).
const PER_MINUTE = 5
const PER_DAY = 30

const HOST = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9-]{2,}$/
const MAX_URL = 2048
const MAX_ERROR = 300
const VERSION = /^\d{1,5}(?:\.\d{1,5}){0,3}$/
// Over twice the largest valid body (about 3 KB), so junk stops early (#130).
const MAX_BYTES = 8_000

type Body = Record<string, unknown>

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // Checked before the rate limit, so a malformed body doesn't count against it (#130).
  let body: Body | null = null
  try {
    const text = await readBody(req, MAX_BYTES)
    if (text === null) return json({ error: 'Request too large' }, 413)
    body = JSON.parse(text)
  } catch { body = null }
  if (body?.kind === 'watch') return await watch(req, body)
  const properties = body?.kind === 'site' ? siteRequest(body) : body?.kind === 'bug' ? bugReport(body) : null
  if (!properties) return json({ error: 'Invalid request' }, 400)

  const limited = await rateLimited(req)
  if (limited) return limited

  if (!SURVEY_ID) return json({ ok: true })
  const sent = await capture('survey sent', crypto.randomUUID(), { $survey_id: SURVEY_ID, ...properties, $survey_completed: true })
  return sent ? json({ ok: true }) : json({ error: 'Could not send' }, 502)
})

async function rateLimited(req: Request): Promise<Response | null> {
  const limit = await checkIpRateLimit(supabase, req, 'site-request', PER_MINUTE, PER_DAY)
  return limit === 'ok' ? null : json({ error: limit === 'over' ? 'Too many requests' : 'Try again shortly' }, limit === 'over' ? 429 : 503)
}

async function watch(req: Request, { host, watch: on }: Body): Promise<Response> {
  if (typeof host !== 'string' || !HOST.test(host) || typeof on !== 'boolean') return json({ error: 'Invalid request' }, 400)
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '')
  const user = token ? (await supabase.auth.getUser(token)).data.user : null
  if (!user) return json({ error: 'Invalid token' }, 401)

  const limited = await rateLimited(req)
  if (limited) return limited

  const { error } = on
    ? await supabase.from('site_watch').upsert({ host, user_id: user.id }, { onConflict: 'host,user_id', ignoreDuplicates: true })
    : await supabase.from('site_watch').delete().eq('host', host).eq('user_id', user.id)
  if (error) {
    console.error('[site-request] watch:', error.code)
    return json({ error: 'Could not save' }, 500)
  }
  return json({ ok: true })
}

function siteRequest({ host }: Body) {
  if (typeof host !== 'string' || !HOST.test(host)) return null
  return { $survey_response: 'Site request', $survey_response_1: host }
}

function bugReport({ url, scraper, error, version }: Body) {
  if (typeof url !== 'string' || url.length > MAX_URL || !/^https?:\/\//.test(url) || !URL.canParse(url)) return null
  if (typeof scraper !== 'string' || !(SCRAPER_NAMES as string[]).includes(scraper)) return null
  if (typeof error !== 'string' || error.length > MAX_ERROR) return null
  if (typeof version !== 'string' || !VERSION.test(version)) return null
  return {
    $survey_response: 'Bug report',
    $survey_response_1: new URL(url).hostname,
    $survey_response_2: url,
    scraper,
    error,
    version,
  }
}
