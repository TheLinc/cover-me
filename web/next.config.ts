import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const config: NextConfig = {
  reactStrictMode: true,
  // Lets a verification build (NEXT_DIST_DIR=.next-verify) run beside a dev server
  // without overwriting the .next/ it is serving from.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
}

export default withSentryConfig(config, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
})
