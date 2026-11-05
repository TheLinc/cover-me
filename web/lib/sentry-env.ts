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
// span attributes). Blank it everywhere: only an answer, sent to PostHog,
// carries the account id.
const ACCOUNT_ID_PARAM = /([?&]u=)[^&#"\\s]+/g

export function dropSurveyAccountId<T>(event: T): T {
  const json = JSON.stringify(event)
  if (json.search(ACCOUNT_ID_PARAM) < 0) return event
  return JSON.parse(json.replace(ACCOUNT_ID_PARAM, '$1'))
}
