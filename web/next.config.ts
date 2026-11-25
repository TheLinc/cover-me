import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const config: NextConfig = {
  reactStrictMode: true,
  // A verification build (NEXT_DIST_DIR=.next-verify) runs beside the dev server without overwriting .next/
  // https://github.com/TheLinc/cover-me/commit/c2aba19f4a0ab0611f28a504069f5e3281d09041
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  // Set here so Sentry's environment tag doesn't depend on Vercel's "expose system env vars" setting (#12).
  env: { NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? '' },
  // A trailing-slash redirect would break PostHog's posts to /relay/e/, so redirects() puts it back for every other path (#33).
  skipTrailingSlashRedirect: true,
  async redirects() {
    return [
      // [\w-] first stops "//evil.com/" and "/\evil.com/" redirecting off-site (#33).
      { source: '/:path((?!relay/)[\\w-].*)/', destination: '/:path', permanent: true },
      { source: '/x', destination: '/?utm_source=x&utm_medium=social&utm_campaign=bio', permanent: false },
      { source: '/r', destination: '/?utm_source=reddit&utm_medium=social', permanent: false },
      { source: '/guides/cover-me-vs-aiapply', destination: '/guides/aiapply-review', permanent: true },
      { source: '/guides/cover-me-vs-jobscan', destination: '/guides/jobscan-review', permanent: true },
      { source: '/guides/cover-me-vs-teal', destination: '/guides/teal-review', permanent: true },
    ]
  },
}

export default withSentryConfig(config, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  // No trailing slash, so the redirect above leaves Sentry's tunnel alone (#183).
  tunnelRoute: '/monitoring',
})
