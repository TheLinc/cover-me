import { describe, expect, it } from 'vitest'
import { dropSurveyAccountId, sentryEnvironment } from './sentry-env'

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

describe('dropSurveyAccountId', () => {
  const id = '3f2b8c1e-9d4a-4e6b-8f1a-2c7d5e9b0a13'
  it('blanks the account id in every field that holds the survey address', () => {
    const event = {
      request: { url: `https://www.cover-me.dev/uninstalled?v=1.4.0&u=${id}` },
      contexts: { trace: { data: { 'url.full': `https://www.cover-me.dev/uninstalled?u=${id}&v=1.4.0` } } },
    }
    const out = JSON.stringify(dropSurveyAccountId(event))
    expect(out).not.toContain(id)
    expect(out).toContain('v=1.4.0')
  })
  it('leaves an event without it unchanged', () => {
    const event = { request: { url: 'https://www.cover-me.dev/?menu=1' } }
    expect(dropSurveyAccountId(event)).toBe(event)
  })
})
