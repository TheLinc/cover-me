import { describe, expect, it } from 'vitest'
import { sentryEnvironment } from './sentry-env'

describe('sentryEnvironment', () => {
  it("uses Vercel's deployment kind, so previews never mix with production", () => {
    expect(sentryEnvironment('production')).toBe('production')
    expect(sentryEnvironment('preview')).toBe('preview')
  })
  it('reports everything off Vercel (local pnpm dev, local builds) as development', () => {
    expect(sentryEnvironment(undefined)).toBe('development')
    expect(sentryEnvironment('development')).toBe('development')
    expect(sentryEnvironment('')).toBe('development')
  })
})
