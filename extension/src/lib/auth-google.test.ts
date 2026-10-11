import { afterEach, describe, expect, test, vi } from 'vitest'
import { completeSignIn, GoogleSignInCancelledError, handleGoogleSignIn, pkcePair, signInWithGoogle } from './auth'

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

function fakeStorage(initial: Record<string, unknown>) {
  const data: Record<string, unknown> = { ...initial }
  return {
    data,
    local: {
      get: vi.fn(async (k: string | string[]) => Object.fromEntries((Array.isArray(k) ? k : [k]).filter((x) => x in data).map((x) => [x, data[x]]))),
      set: vi.fn(async (o: Record<string, unknown>) => { Object.assign(data, o) }),
      remove: vi.fn(async (k: string) => { delete data[k] }),
    },
  }
}

describe('completeSignIn', () => {
  test('saves the session, switches to the account, and syncs a resume uploaded earlier', async () => {
    const storage = fakeStorage({
      settings: { provider: 'openai', apiKey: 'enc', mode: 'byok' },
      resume: { text: 'resume text', filename: 'cv.pdf', updatedAt: '2026-10-09T00:00:00Z' },
    })
    vi.stubGlobal('chrome', { storage })
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await completeSignIn(session)

    expect(storage.data.session).toEqual(session)
    expect(storage.data.settings).toEqual({ provider: 'openai', apiKey: 'enc', mode: 'hosted' })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/\/functions\/v1\/resume$/)
    expect(JSON.parse(init.body as string)).toEqual({ text: 'resume text', filename: 'cv.pdf' })
  })

  test('with no resume yet, nothing is uploaded and a fresh install gets default settings', async () => {
    const storage = fakeStorage({})
    vi.stubGlobal('chrome', { storage })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await completeSignIn(session)

    expect(storage.data.settings).toEqual({ provider: 'claude', apiKey: '', mode: 'hosted' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('a failed resume sync does not fail the sign-in', async () => {
    vi.stubGlobal('chrome', { storage: fakeStorage({ resume: { text: 't', filename: 'f', updatedAt: '' } }) })
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"boom"}', { status: 500 })))
    await expect(completeSignIn(session)).resolves.toBeUndefined()
  })
})

// Runs in the service worker: the popup closes when Google's window takes
// focus, so the worker must finish the sign-in on its own.
describe('handleGoogleSignIn', () => {
  test('signs in, completes the sign-in, and reports the session', async () => {
    const storage = fakeStorage({})
    vi.stubGlobal('chrome', { storage, identity: { getRedirectURL: () => REDIRECT, launchWebAuthFlow: vi.fn(async () => `${REDIRECT}?code=c`) } })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(session), { status: 200 })))

    expect(await handleGoogleSignIn()).toEqual({ success: true, session })
    expect(storage.data.session).toEqual(session)
    expect(storage.data.settings).toEqual({ provider: 'claude', apiKey: '', mode: 'hosted' })
  })

  test('a closed window reports a cancel with no error message', async () => {
    vi.stubGlobal('chrome', { storage: fakeStorage({}), identity: { getRedirectURL: () => REDIRECT, launchWebAuthFlow: vi.fn(async () => { throw new Error('The user did not approve access.') }) } })
    expect(await handleGoogleSignIn()).toEqual({ success: false, cancelled: true })
  })

  test('a failure reports its message', async () => {
    vi.stubGlobal('chrome', { storage: fakeStorage({}), identity: { getRedirectURL: () => REDIRECT, launchWebAuthFlow: vi.fn(async () => `${REDIRECT}#error_description=nope`) } })
    expect(await handleGoogleSignIn()).toEqual({ success: false, cancelled: false, error: 'nope' })
  })
})
