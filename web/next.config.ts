import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const config: NextConfig = {
  reactStrictMode: true,
  // Lets a verification build (NEXT_DIST_DIR=.next-verify) run beside a dev server
  // without overwriting the .next/ it is serving from.
  // https://github.com/TheLinc/cover-me/commit/c2aba19f4a0ab0611f28a504069f5e3281d09041
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  // Vercel sets VERCEL_ENV (production | preview) at build time; this hands it
  // to the browser bundle for Sentry's environment tag (lib/sentry-env.ts)
  // without depending on the project's "expose system env vars" setting (#12).
  env: { NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? '' },
  // PostHog's SDK posts to /relay/e/ (app/relay), and a trailing-slash
  // redirect would break that (#33)...
  skipTrailingSlashRedirect: true,
  // ...and puts back the trailing-slash redirect for every other page, so
  // /about/ doesn't serve a duplicate of /about (#33).
  async redirects() {
    // A word character first: "//evil.com/" and "/\evil.com/" must not become
    // a redirect to another site (browsers read "/\" as "//") (#33)
    return [
      { source: '/:path((?!relay/)[\\w-].*)/', destination: '/:path', permanent: true },
      // Short links for the X bio (#61) and Reddit posts, so the URL doesn't show the utm_ tags.
      // Temporary (307) so browsers don't cache them and the targets can change.
      { source: '/x', destination: '/?utm_source=x&utm_medium=social&utm_campaign=bio', permanent: false },
      { source: '/r', destination: '/?utm_source=reddit&utm_medium=social', permanent: false },
    ]
  },
}

export default withSentryConfig(config, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  // Browser events post to /monitoring?o=..&p=.. on this site, which forwards to
  // Sentry, so ad blockers don't drop them (as /relay does for PostHog). No
  // trailing slash, so the redirect above leaves it alone (#183).
  tunnelRoute: '/monitoring',
})
