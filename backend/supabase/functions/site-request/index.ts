// The extension's "Request this site" and "Report bug" buttons (#130). Each
// press sends one response to a PostHog survey in API mode:
//   POST { kind: 'site', host }                          a site to support
//   POST { kind: 'bug', url, scraper, error, version }   a supported board that failed
// The survey's questions, in order: type ("Site request" or "Bug report"),
// site (a hostname) and page URL (bug reports only). The scraper, error and
// version go with a bug report as event properties.
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
import { SCRAPER_NAMES } from '../_shared/scrapers/index.ts'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SERVICE_KEY')!)
const SURVEY_ID = Deno.env.get('POSTHOG_SITE_SURVEY_ID') ?? ''

// One press per screen, so a person stays far below these.
const PER_MINUTE = 5
const PER_DAY = 30

const HOST = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9-]{2,}$/
const MAX_URL = 2048
const MAX_ERROR = 300
const VERSION = /^\d{1,5}(?:\.\d{1,5}){0,3}$/

type Body = Record<string, unknown>

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // Validated before the rate limit, so a malformed body doesn't use it up.
  const body = await req.json().catch(() => null) as Body | null
  const properties = body?.kind === 'site' ? siteRequest(body) : body?.kind === 'bug' ? bugReport(body) : null
  if (!properties) return json({ error: 'Invalid request' }, 400)

  const limit = await checkIpRateLimit(supabase, req, 'site-request', PER_MINUTE, PER_DAY)
  if (limit !== 'ok') return json({ error: limit === 'over' ? 'Too many requests' : 'Try again shortly' }, limit === 'over' ? 429 : 503)

  if (!SURVEY_ID) return json({ ok: true })
  const sent = await capture('survey sent', crypto.randomUUID(), { $survey_id: SURVEY_ID, ...properties, $survey_completed: true })
  return sent ? json({ ok: true }) : json({ error: 'Could not send' }, 502)
})

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
