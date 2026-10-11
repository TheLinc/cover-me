import { describe, expect, it } from 'vitest'
import { afterOAuth, oauthRedirectUrl } from './auth-redirect'

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
