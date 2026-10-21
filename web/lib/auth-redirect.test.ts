import { describe, expect, it } from 'vitest'
import { afterOAuth, hashReturn, oauthCancelled, oauthErrorDescription, oauthRedirectUrl, safeNext } from './auth-redirect'

describe('oauthErrorDescription', () => {
  it('reads Supabase\'s reason from the query or the fragment', () => {
    expect(oauthErrorDescription('?oauth=1&error=server_error&error_description=Database+error+saving+new+user', '')).toBe('Database error saving new user')
    expect(oauthErrorDescription('?oauth=1', '#error=server_error&error_description=Unsupported%20provider')).toBe('Unsupported provider')
  })
  it('is empty when there is no reason', () => {
    expect(oauthErrorDescription('?oauth=1&code=abc', '')).toBe('')
  })
})

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
  it('returns to the dashboard page that sent the user to sign in', () => {
    expect(oauthRedirectUrl('https://www.cover-me.dev', null, '/dashboard/applications'))
      .toBe('https://www.cover-me.dev/auth?oauth=1&next=%2Fdashboard%2Fapplications')
    expect(afterOAuth(null, '/dashboard/applications')).toBe('/dashboard/applications')
    expect(afterOAuth('pro', '/dashboard/applications')).toBe('/dashboard?upgrade=1')
  })
})

describe('safeNext', () => {
  it('allows dashboard paths only', () => {
    expect(safeNext('/dashboard')).toBe('/dashboard')
    expect(safeNext('/dashboard/applications')).toBe('/dashboard/applications')
    for (const bad of ['https://evil.example/dashboard', '//evil.example', '/dashboard/../x', '/dashboardx', '/dashboard?x=1', '/\\evil.example', null, '']) {
      expect(safeNext(bad)).toBeNull()
    }
  })
})

describe('hashReturn', () => {
  it('opens a sign-up link on "confirmed" and a recovery link on "reset"', () => {
    expect(hashReturn('#access_token=x&refresh_token=y&type=signup')).toEqual({ view: 'confirmed', error: '' })
    expect(hashReturn('#access_token=x&refresh_token=y&type=recovery')).toEqual({ view: 'reset', error: '' })
    expect(hashReturn('#access_token=x&refresh_token=y&type=magiclink')).toEqual({ view: null, error: '' })
  })
  it('names an expired or used link, else shows Supabase\'s reason', () => {
    expect(hashReturn('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired').error)
      .toBe('That confirmation link has expired. Sign in or sign up again to get a new one.')
    expect(hashReturn('#error=access_denied&error_code=access_denied').error)
      .toBe('This link is invalid or has already been used. Sign in or request a new link.')
    expect(hashReturn('#error=server_error&error_description=Database+error')).toEqual({ view: null, error: 'Database error' })
    expect(hashReturn('#error=server_error')).toEqual({ view: null, error: 'Something went wrong. Please try again.' })
  })
  it('is empty with no hash or no token', () => {
    expect(hashReturn('')).toEqual({ view: null, error: '' })
    expect(hashReturn('#type=signup')).toEqual({ view: null, error: '' })
  })
})
