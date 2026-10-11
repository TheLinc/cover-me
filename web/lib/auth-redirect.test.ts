import { describe, expect, it } from 'vitest'
import { afterOAuth, oauthCancelled, oauthRedirectUrl } from './auth-redirect'

describe('oauthCancelled', () => {
  it('is true when Google reports access_denied, in the query or the fragment', () => {
    expect(oauthCancelled('?oauth=1&error=access_denied&error_description=', '')).toBe(true)
    expect(oauthCancelled('?oauth=1', '#error=access_denied&error_code=access_denied')).toBe(true)
  })
  it('is false for other errors and for a normal return', () => {
    expect(oauthCancelled('?oauth=1&error=server_error', '')).toBe(false)
    expect(oauthCancelled('?oauth=1&code=abc', '')).toBe(false)
  })
})

describe('Google sign-in redirects', () => {
  it('returns to /auth marked as an OAuth sign-in', () => {
    expect(oauthRedirectUrl('https://www.cover-me.dev', null)).toBe('https://www.cover-me.dev/auth?oauth=1')
  })
  it('keeps the Pro intent through the round trip', () => {
    expect(oauthRedirectUrl('https://www.cover-me.dev', 'pro')).toBe('https://www.cover-me.dev/auth?oauth=1&plan=pro')
    expect(afterOAuth('pro')).toBe('/dashboard?upgrade=1')
  })
  it('lands everyone else on the dashboard', () => {
    expect(afterOAuth(null)).toBe('/dashboard')
    expect(afterOAuth('anything-else')).toBe('/dashboard')
  })
})
