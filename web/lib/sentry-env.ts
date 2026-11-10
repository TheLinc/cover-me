// Sentry's environment tag, from Vercel's own deployment kind rather than
// NODE_ENV: preview deployments run with NODE_ENV=production and would
// otherwise mix with real users. Off Vercel (local `pnpm dev`) it's
// "development". Filter Sentry to "production" to see only real users.
// The literal process.env reads let Next inline them into the browser bundle.
export type SentryEnvironment = 'production' | 'preview' | 'development'

export function sentryEnvironment(
  vercelEnv: string | undefined = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV,
): SentryEnvironment {
  return vercelEnv === 'production' || vercelEnv === 'preview' ? vercelEnv : 'development'
}

// The uninstall survey's address carries the account id as u= (app/uninstalled),
// and Sentry copies the page address into several fields of an event (request,
// span attributes). Blank it everywhere. Only two things carry the account id:
// an answer, sent to PostHog, and the extension-removed call (#126).
const ACCOUNT_ID_PARAM = /([?&]u=)[^&#"\\\s]+/g

// An event JSON can't hold (a cycle, a BigInt) goes unchanged, rather than Sentry dropping it on the throw
export function dropSurveyAccountId<T>(event: T): T {
  try {
    const json = JSON.stringify(event)
    if (json.search(ACCOUNT_ID_PARAM) < 0) return event
    return JSON.parse(json.replace(ACCOUNT_ID_PARAM, '$1'))
  } catch {
    return event
  }
}

type ServerEvent = {
  request?: { data?: unknown; cookies?: unknown; headers?: unknown }
  user?: { id?: string | number; email?: string } | null
}

// beforeSend for the server and edge runtimes. Drops the request body (cover
// letter or resume text), cookies and headers (auth tokens), keeps only the
// opaque user id, and blanks the survey account id.
export function scrubServerEvent<T extends ServerEvent>(event: T): T {
  if (event.request) {
    delete event.request.data
    delete event.request.cookies
    delete event.request.headers
  }
  if (event.user?.email) event.user = { id: event.user.id }
  return dropSurveyAccountId(event)
}
