import { afterEach, describe, expect, test, vi } from 'vitest'
import { GoogleSignInCancelledError, pkcePair, signInWithGoogle } from './auth'

const REDIRECT = 'https://abc.chromiumapp.org/'
const session = { access_token: 'at', refresh_token: 'rt', expires_at: 2_000_000_000, user: { id: 'u1', email: 'a@b.co' } }

function fakeIdentity(launch: (opts: { url: string }) => Promise<string | undefined>) {
  vi.stubGlobal('chrome', { identity: { getRedirectURL: () => REDIRECT, launchWebAuthFlow: vi.fn(launch) } })
}

afterEach(() => vi.unstubAllGlobals())

describe('pkcePair', () => {
  test('challenge is the base64url SHA-256 of the verifier', async () => {
    const { verifier, challenge } = await pkcePair()
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/)
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
    const expected = btoa(String.fromCharCode(...digest)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    expect(challenge).toBe(expected)
  })
})

describe('signInWithGoogle', () => {
  test('asks Supabase for Google with PKCE, then exchanges the code', async () => {
    let authorizeUrl = ''
    fakeIdentity(async ({ url }) => { authorizeUrl = url; return `${REDIRECT}?code=the-code` })
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(session), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    expect(await signInWithGoogle()).toEqual(session)

    // SUPABASE_URL is empty in CI (no .env), so resolve against a dummy base.
    const u = new URL(authorizeUrl, 'https://supabase.test')
    expect(u.pathname).toBe('/auth/v1/authorize')
    expect(u.searchParams.get('provider')).toBe('google')
    expect(u.searchParams.get('redirect_to')).toBe(REDIRECT)
    expect(u.searchParams.get('code_challenge_method')).toBe('s256')
    const [tokenUrl, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(tokenUrl).toMatch(/\/auth\/v1\/token\?grant_type=pkce$/)
    const body = JSON.parse(init.body as string)
    expect(body.auth_code).toBe('the-code')
    // The verifier sent must be the one whose hash went to /authorize.
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body.code_verifier)))
    const challenge = btoa(String.fromCharCode(...digest)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    expect(u.searchParams.get('code_challenge')).toBe(challenge)
  })

  test('closing the Google window is a cancel, not an error', async () => {
    fakeIdentity(async () => { throw new Error('The user did not approve access.') })
    await expect(signInWithGoogle()).rejects.toBeInstanceOf(GoogleSignInCancelledError)
  })

  test('a Google page that fails to load is an error, not a silent cancel', async () => {
    fakeIdentity(async () => { throw new Error('Authorization page could not be loaded.') })
    const err = await signInWithGoogle().catch((e) => e)
    expect(err).not.toBeInstanceOf(GoogleSignInCancelledError)
    expect(err.message).toMatch(/could not be loaded/)
  })

  test('an error from Supabase in the redirect is shown to the user', async () => {
    fakeIdentity(async () => `${REDIRECT}#error=server_error&error_description=Unsupported+provider%3A+provider+is+not+enabled`)
    const err = await signInWithGoogle().catch((e) => e)
    expect(err).not.toBeInstanceOf(GoogleSignInCancelledError)
    expect(err.message).toBe('Unsupported provider: provider is not enabled')
  })

  test('a failed code exchange surfaces the server message', async () => {
    fakeIdentity(async () => `${REDIRECT}?code=stale`)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error_description: 'invalid flow state' }), { status: 400 })))
    await expect(signInWithGoogle()).rejects.toThrow('invalid flow state')
  })
})
