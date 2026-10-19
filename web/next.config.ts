import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const config: NextConfig = {
  reactStrictMode: true,
  // Lets a verification build (NEXT_DIST_DIR=.next-verify) run beside a dev server
  // without overwriting the .next/ it is serving from.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  // Vercel sets VERCEL_ENV (production | preview) at build time; this hands it
  // to the browser bundle for Sentry's environment tag (lib/sentry-env.ts)
  // without depending on the project's "expose system env vars" setting.
  env: { NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? '' },
  // PostHog's SDK posts to /relay/e/ (app/relay), and a trailing-slash
  // redirect would break that...
  skipTrailingSlashRedirect: true,
  // ...and puts back the trailing-slash redirect for every other page, so
  // /about/ doesn't serve a duplicate of /about.
  async redirects() {
    // [^/] first: "//evil.com/" must not become a redirect to //evil.com
    return [{ source: '/:path((?!relay/)[^/].*)/', destination: '/:path', permanent: true }]
  },
}

export default withSentryConfig(config, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
})
