import { describe, expect, it } from 'vitest'
import { hasSessionCookie } from './session-cookie'

describe('hasSessionCookie', () => {
  it('finds a whole Supabase session cookie', () => {
    expect(hasSessionCookie('ph=1; sb-abc-auth-token=x')).toBe(true)
  })

  it('finds a session cookie split into chunks', () => {
    expect(hasSessionCookie('sb-abc-auth-token.0=x; sb-abc-auth-token.1=y')).toBe(true)
  })

  it('ignores the PKCE verifier left by an unfinished email sign-in', () => {
    expect(hasSessionCookie('sb-abc-auth-token-code-verifier=x')).toBe(false)
  })

  it('ignores a cookie whose name only ends like the session cookie', () => {
    expect(hasSessionCookie('xsb-abc-auth-token=x')).toBe(false)
    expect(hasSessionCookie('sb-abc-auth-token-0=x')).toBe(false)
  })

  it('is false with no cookies', () => {
    expect(hasSessionCookie('')).toBe(false)
  })
})
