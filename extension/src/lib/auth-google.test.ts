import { afterEach, describe, expect, test, vi } from 'vitest'
import { completeSignIn, ensureValidSession, fetchTier, GoogleSignInCancelledError, handleGoogleSignIn, pkcePair, signInWithGoogle } from './auth'

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

  test('the session keeps the Google profile picture for the account avatar', async () => {
    fakeIdentity(async () => `${REDIRECT}?code=c`)
    const withPicture = { ...session, user: { ...session.user, user_metadata: { avatar_url: 'https://lh3.googleusercontent.com/a/p=s96-c' } } }
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(withPicture), { status: 200 })))
    expect((await signInWithGoogle()).user.avatar_url).toBe('https://lh3.googleusercontent.com/a/p=s96-c')
  })

  test('a picture link that is not https is dropped', async () => {
    fakeIdentity(async () => `${REDIRECT}?code=c`)
    const bad = { ...session, user: { ...session.user, user_metadata: { avatar_url: 'javascript:alert(1)' } } }
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(bad), { status: 200 })))
    expect((await signInWithGoogle()).user.avatar_url).toBeUndefined()
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

  test('Cancel on Google\'s consent screen is a cancel, not an error', async () => {
    fakeIdentity(async () => `${REDIRECT}?error=access_denied&error_description=`)
    await expect(signInWithGoogle()).rejects.toBeInstanceOf(GoogleSignInCancelledError)
  })

  test('an error with an empty description still gets a message', async () => {
    fakeIdentity(async () => `${REDIRECT}#error=server_error&error_description=`)
    await expect(signInWithGoogle()).rejects.toThrow('Google sign-in failed. Please try again.')
  })

  test('a failed exchange with an empty server message still gets a message', async () => {
    fakeIdentity(async () => `${REDIRECT}?code=c`)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error_description: '', msg: '' }), { status: 400 })))
    await expect(signInWithGoogle()).rejects.toThrow('Google sign-in failed. Please try again.')
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
      remove: vi.fn(async (k: string | string[]) => { for (const key of [k].flat()) delete data[key] }),
    },
  }
}

describe('completeSignIn', () => {
  // The resume function: GET returns the account's copy (404 when there is
  // none), POST replaces it. Records what was uploaded.
  function resumeServer(stored: { text: string; filename: string; updated_at: string } | null) {
    const uploads: unknown[] = []
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('/rest/v1/users')) return new Response('[{"tier":"hosted_pro"}]', { status: 200 })
      if (!url.endsWith('/functions/v1/resume')) throw new Error(`unexpected ${url}`)
      if (init?.method === 'POST') { uploads.push(JSON.parse(init.body as string)); return new Response('{}', { status: 200 }) }
      return stored ? new Response(JSON.stringify(stored), { status: 200 }) : new Response('{"error":"No resume found"}', { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)
    return { uploads, fetchMock }
  }

  test('saves the session, switches to the account, and uploads a resume the account lacks', async () => {
    const storage = fakeStorage({
      settings: { provider: 'openai', apiKey: 'enc', mode: 'byok' },
      resume: { text: 'resume text', filename: 'cv.pdf', updatedAt: '2026-10-09T00:00:00Z' },
    })
    vi.stubGlobal('chrome', { storage })
    const server = resumeServer(null)

    await completeSignIn(session)

    expect(storage.data.session).toEqual(session)
    expect(storage.data.settings).toEqual({ provider: 'openai', apiKey: 'enc', mode: 'hosted' })
    expect(server.uploads).toEqual([{ text: 'resume text', filename: 'cv.pdf' }])
  })

  // A Google sign-in finishes in the worker with no panel open, so the sign-in
  // itself caches the tier (Pro history sync reads it).
  test("caches the account's tier", async () => {
    const storage = fakeStorage({ cachedTier: 'hosted_free' })
    vi.stubGlobal('chrome', { storage })
    resumeServer(null)

    await completeSignIn(session)

    expect(storage.data.cachedTier).toBe('hosted_pro')
  })

  // A new device: no local resume, so the account's copy comes down and the
  // user doesn't upload it again.
  test('on a new device, the account\'s resume is downloaded', async () => {
    const storage = fakeStorage({})
    vi.stubGlobal('chrome', { storage })
    const server = resumeServer({ text: 'from the account', filename: 'cv.pdf', updated_at: '2026-10-01T00:00:00Z' })

    await completeSignIn(session)

    expect(storage.data.resume).toEqual({ text: 'from the account', filename: 'cv.pdf', updatedAt: '2026-10-01T00:00:00Z', accountId: 'u1' })
    expect(server.uploads).toEqual([])
  })

  test('the newer copy wins: a newer account copy replaces an older local one', async () => {
    const storage = fakeStorage({ resume: { text: 'old local', filename: 'old.pdf', updatedAt: '2026-09-01T00:00:00Z' } })
    vi.stubGlobal('chrome', { storage })
    const server = resumeServer({ text: 'newer account copy', filename: 'new.pdf', updated_at: '2026-10-01T00:00:00Z' })

    await completeSignIn(session)

    expect((storage.data.resume as { text: string }).text).toBe('newer account copy')
    expect(server.uploads).toEqual([])
  })

  test('the newer copy wins: a newer local resume replaces the account copy', async () => {
    const storage = fakeStorage({ resume: { text: 'newer local', filename: 'new.pdf', updatedAt: '2026-10-05T00:00:00Z' } })
    vi.stubGlobal('chrome', { storage })
    const server = resumeServer({ text: 'old account copy', filename: 'old.pdf', updated_at: '2026-10-01T00:00:00Z' })

    await completeSignIn(session)

    expect(server.uploads).toEqual([{ text: 'newer local', filename: 'new.pdf' }])
    expect((storage.data.resume as { text: string }).text).toBe('newer local')
  })

  // Re-uploading identical text would clear the server's parsed-resume cache.
  test('the same resume on both sides moves nothing', async () => {
    const local = { text: 'same', filename: 'cv.pdf', updatedAt: '2026-10-01T00:00:00Z', parsed: { name: 'Pat' } }
    const storage = fakeStorage({ resume: local })
    vi.stubGlobal('chrome', { storage })
    const server = resumeServer({ text: 'same', filename: 'cv.pdf', updated_at: '2026-10-01T00:00:05Z' })

    await completeSignIn(session)

    expect(server.uploads).toEqual([])
    expect(storage.data.resume).toEqual({ ...local, accountId: 'u1' })
  })

  // Person A signs out and person B signs in on the same browser. A's resume
  // must never end up in B's account.
  test("another account's resume is never uploaded; this account's copy replaces it", async () => {
    const storage = fakeStorage({ resume: { text: "A's resume", filename: 'a.pdf', updatedAt: '2026-10-09T00:00:00Z', accountId: 'someone-else' } })
    vi.stubGlobal('chrome', { storage })
    const server = resumeServer({ text: "B's resume", filename: 'b.pdf', updated_at: '2026-10-01T00:00:00Z' })

    await completeSignIn(session)

    expect(server.uploads).toEqual([])
    expect(storage.data.resume).toEqual({ text: "B's resume", filename: 'b.pdf', updatedAt: '2026-10-01T00:00:00Z', accountId: 'u1' })
  })

  test("another account's resume is removed when this account has none", async () => {
    const storage = fakeStorage({ resume: { text: "A's resume", filename: 'a.pdf', updatedAt: '2026-10-09T00:00:00Z', accountId: 'someone-else' } })
    vi.stubGlobal('chrome', { storage })
    const server = resumeServer(null)

    await completeSignIn(session)

    expect(server.uploads).toEqual([])
    expect(storage.data.resume).toBeUndefined()
  })

  test('an uploaded resume is tagged with the account it went to', async () => {
    const storage = fakeStorage({ resume: { text: 'mine', filename: 'cv.pdf', updatedAt: '2026-10-09T00:00:00Z' } })
    vi.stubGlobal('chrome', { storage })
    resumeServer(null)

    await completeSignIn(session)

    expect((storage.data.resume as { accountId?: string }).accountId).toBe('u1')
  })

  // A copy added while signed out may be someone else's (a shared browser), so
  // a sign-in never uploads it: the account's copy wins when they differ.
  test('a signed-out upload is never uploaded; the account copy wins even when older', async () => {
    const storage = fakeStorage({ resume: { text: "someone's new file", filename: 'x.pdf', updatedAt: '2026-10-11T00:00:00Z', accountId: 'u1', signedOutUpload: true } })
    vi.stubGlobal('chrome', { storage })
    const server = resumeServer({ text: 'account copy', filename: 'cv.pdf', updated_at: '2026-10-01T00:00:00Z' })

    await completeSignIn(session)

    expect(server.uploads).toEqual([])
    expect(storage.data.resume).toEqual({ text: 'account copy', filename: 'cv.pdf', updatedAt: '2026-10-01T00:00:00Z', accountId: 'u1' })
  })

  test('a signed-out copy that matches the account copy loses its "not in your account" mark', async () => {
    const storage = fakeStorage({ resume: { text: 'same', filename: 'cv.pdf', updatedAt: '2026-10-11T00:00:00Z', accountId: 'u1', signedOutUpload: true } })
    vi.stubGlobal('chrome', { storage })
    const server = resumeServer({ text: 'same', filename: 'cv.pdf', updated_at: '2026-10-01T00:00:00Z' })

    await completeSignIn(session)

    expect(server.uploads).toEqual([])
    expect((storage.data.resume as { signedOutUpload?: boolean }).signedOutUpload).toBeUndefined()
  })

  test('a signed-out upload stays local when the account has no resume', async () => {
    const local = { text: 'new file', filename: 'x.pdf', updatedAt: '2026-10-11T00:00:00Z', accountId: 'u1', signedOutUpload: true }
    const storage = fakeStorage({ resume: local })
    vi.stubGlobal('chrome', { storage })
    const server = resumeServer(null)

    await completeSignIn(session)

    expect(server.uploads).toEqual([])
    expect(storage.data.resume).toEqual(local)
  })

  test("another account's copy is removed even when the account's copy can't be fetched", async () => {
    const storage = fakeStorage({ resume: { text: "A's resume", filename: 'a.pdf', updatedAt: '2026-10-09T00:00:00Z', accountId: 'someone-else' } })
    vi.stubGlobal('chrome', { storage })
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"boom"}', { status: 500 })))

    await completeSignIn(session)

    expect(storage.data.resume).toBeUndefined()
  })

  // The user drops a file on the welcome tab while the sign-in's sync runs.
  test('a resume the user adds during the sync is not overwritten', async () => {
    const storage = fakeStorage({})
    vi.stubGlobal('chrome', { storage })
    const added = { text: 'just added', filename: 'new.pdf', updatedAt: '2026-10-11T12:00:00Z' }
    vi.stubGlobal('fetch', vi.fn(async () => {
      storage.data.resume = added // lands while the GET is in flight
      return new Response(JSON.stringify({ text: 'account copy', filename: 'cv.pdf', updated_at: '2026-10-01T00:00:00Z' }), { status: 200 })
    }))

    await completeSignIn(session)

    expect(storage.data.resume).toEqual(added)
  })

  // Panels watching the session read the mode when it arrives, so the mode
  // must already say hosted by then.
  test('hosted mode is saved before the session', async () => {
    const storage = fakeStorage({ settings: { provider: 'claude', apiKey: 'enc', mode: 'byok' } })
    vi.stubGlobal('chrome', { storage })
    vi.stubGlobal('fetch', vi.fn())

    await completeSignIn(session)

    const keys = storage.local.set.mock.calls.map(([o]) => Object.keys(o)[0])
    expect(keys.indexOf('settings')).toBeLessThan(keys.indexOf('session'))
  })

  test('any sign-in clears a saved Google error, so it never shows after sign-out', async () => {
    const storage = fakeStorage({ googleSignInError: 'old failure' })
    vi.stubGlobal('chrome', { storage })
    vi.stubGlobal('fetch', vi.fn())

    await completeSignIn(session)

    expect(storage.data.googleSignInError).toBeUndefined()
  })

  test('with no resume anywhere, nothing moves and a fresh install gets default settings', async () => {
    const storage = fakeStorage({})
    vi.stubGlobal('chrome', { storage })
    const server = resumeServer(null)

    await completeSignIn(session)

    expect(storage.data.settings).toEqual({ provider: 'claude', apiKey: '', mode: 'hosted' })
    expect(storage.data.resume).toBeUndefined()
    expect(server.uploads).toEqual([])
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

  // The popup that started the flow has closed by now, so the error is kept
  // for the next panel that opens.
  test('a failure is saved for the next panel to show', async () => {
    const storage = fakeStorage({})
    vi.stubGlobal('chrome', { storage, identity: { getRedirectURL: () => REDIRECT, launchWebAuthFlow: vi.fn(async () => `${REDIRECT}#error_description=nope`) } })
    await handleGoogleSignIn()
    expect(storage.data.googleSignInError).toBe('nope')
  })

  test('a success or a cancel clears an old saved failure', async () => {
    const storage = fakeStorage({ googleSignInError: 'old' })
    vi.stubGlobal('chrome', { storage, identity: { getRedirectURL: () => REDIRECT, launchWebAuthFlow: vi.fn(async () => { throw new Error('The user did not approve access.') }) } })
    await handleGoogleSignIn()
    expect(storage.data.googleSignInError).toBeUndefined()
  })
})

// A failed lookup must not read as "free": a Pro user's cached tier would be
// overwritten, and Pro history sync would stop.
describe('fetchTier', () => {
  test('returns null when the lookup fails, offline or with an expired token', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    expect(await fetchTier('u1', 'at')).toBeNull()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })))
    expect(await fetchTier('u1', 'at')).toBeNull()
  })

  test('returns the tier, or free when the account has no row yet', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('[{"tier":"hosted_pro"}]', { status: 200 })))
    expect(await fetchTier('u1', 'at')).toBe('hosted_pro')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('[]', { status: 200 })))
    expect(await fetchTier('u1', 'at')).toBe('hosted_free')
  })
})

// An expired access token is refreshed before use. Only a refresh the server
// rejects ends the session; being offline must not sign the user out.
describe('ensureValidSession', () => {
  const expired = { ...session, expires_at: 1 }

  test('offline: keeps the session instead of signing out', async () => {
    const storage = fakeStorage({ session: expired })
    vi.stubGlobal('chrome', { storage })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))

    expect(await ensureValidSession()).toEqual(expired)
    expect(storage.data.session).toEqual(expired)
  })

  test('a server error or rate limit on refresh keeps the session', async () => {
    for (const status of [503, 429]) {
      const storage = fakeStorage({ session: expired })
      vi.stubGlobal('chrome', { storage })
      vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status })))

      expect(await ensureValidSession()).toEqual(expired)
      expect(storage.data.session).toEqual(expired)
    }
  })

  test('a refresh the server rejects ends the session', async () => {
    const storage = fakeStorage({ session: expired })
    vi.stubGlobal('chrome', { storage })
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"invalid_grant"}', { status: 400 })))

    expect(await ensureValidSession()).toBeNull()
    expect(storage.data.session).toBeUndefined()
  })
})
