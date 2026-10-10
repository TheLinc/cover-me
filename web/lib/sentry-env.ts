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
