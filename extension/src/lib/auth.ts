import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, WEB_URL } from './config'
import { clearSession, getResume, getSession, getSettings, saveGoogleSignInError, saveSession, saveSettings, takeGoogleSignInError } from './storage'
import { isValidResume } from './ai/resume-tailor'
import { deriveTailorProgress } from './ai/tailor-progress'
import type { ApplicationRecord, AuthSession, CoverLetter, JobData, TailoredResume } from '../types'

// Thrown by signUp() when the account was created but needs email confirmation
// before it can sign in — not a failure, so callers should render it as a
// neutral/success notice rather than an error.
export class EmailConfirmationRequiredError extends Error {}

function authHeaders(token?: string): HeadersInit {
  const h: HeadersInit = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_PUBLISHABLE_KEY,
  }
  if (token) (h as Record<string, string>)['Authorization'] = `Bearer ${token}`
  return h
}

export async function signIn(email: string, password: string): Promise<AuthSession> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json() as Record<string, unknown>
  if (!res.ok) {
    throw new Error(
      (data.error_description as string) ?? (data.message as string) ?? 'Sign in failed',
    )
  }
  return parseSession(data)
}

export async function signUp(email: string, password: string): Promise<AuthSession> {
  const redirectTo = encodeURIComponent(`${WEB_URL}/auth`)
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup?redirect_to=${redirectTo}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json() as Record<string, unknown>
  if (!res.ok) {
    throw new Error(
      (data.error_description as string) ?? (data.message as string) ?? 'Sign up failed',
    )
  }
  if (!data.access_token) {
    throw new EmailConfirmationRequiredError('Check your email to confirm your account, then sign in.')
  }
  return parseSession(data)
}

// Closing the Google window rejects launchWebAuthFlow; callers treat this as
// "nothing happened" and show no error.
export class GoogleSignInCancelledError extends Error {}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function pkcePair(): Promise<{ verifier: string; challenge: string }> {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)))
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
  return { verifier, challenge: base64url(digest) }
}

// Supabase OAuth with PKCE inside Chrome's auth window. Supabase redirects to
// https://<extension-id>.chromiumapp.org/?code=…, which must be on the
// project's Redirect URL allowlist (exact ID, never a wildcard).
export async function signInWithGoogle(): Promise<AuthSession> {
  const { verifier, challenge } = await pkcePair()
  const url = `${SUPABASE_URL}/auth/v1/authorize?${new URLSearchParams({
    provider: 'google',
    redirect_to: chrome.identity.getRedirectURL(),
    code_challenge: challenge,
    code_challenge_method: 's256',
  })}`

  let callback: string | undefined
  try {
    callback = await chrome.identity.launchWebAuthFlow({ url, interactive: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    // Chrome's message when the user closes the window. Anything else (the
    // page failed to load, say) is a real failure the user should see.
    if (/did not approve/i.test(message)) throw new GoogleSignInCancelledError(message)
    throw new Error(message || 'Google sign-in failed. Please try again.')
  }
  if (!callback) throw new GoogleSignInCancelledError('Sign-in cancelled')

  // Success comes back in the query; Supabase reports errors in the fragment.
  const u = new URL(callback)
  const params = new URLSearchParams(`${u.search.slice(1)}&${u.hash.slice(1)}`)
  const code = params.get('code')
  // access_denied: the user pressed Cancel on Google's consent screen.
  if (params.get('error') === 'access_denied') throw new GoogleSignInCancelledError('Sign-in cancelled')
  if (!code) throw new Error(params.get('error_description') || 'Google sign-in failed. Please try again.')

  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=pkce`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
  })
  const data = await res.json() as Record<string, unknown>
  if (!res.ok) {
    throw new Error((data.error_description as string) || (data.msg as string) || 'Google sign-in failed. Please try again.')
  }
  return parseSession(data)
}

// Everything a successful sign-in (email or Google) must leave behind for the
// first hosted Generate to work: the session, hosted mode, and the backend copy
// of a resume uploaded before signing in. A failed sync is non-fatal: the
// resume page retries on the next upload.
export async function completeSignIn(sess: AuthSession): Promise<void> {
  // A saved Google failure is moot once any sign-in succeeds.
  await takeGoogleSignInError()
  // Mode first: panels watching the session read the mode when it lands.
  const existing = await getSettings()
  await saveSettings({ provider: existing?.provider ?? 'claude', apiKey: existing?.apiKey ?? '', mode: 'hosted' })
  await saveSession(sess)
  const resume = await getResume()
  if (resume?.text) {
    await uploadResumeToBackend(sess.access_token, resume.text, resume.filename).catch(() => {})
  }
}

export type GoogleSignInResponse =
  | { success: true; session: AuthSession }
  | { success: false; cancelled: boolean; error?: string }

// The GOOGLE_SIGN_IN message handler. It runs in the service worker because the
// popup closes as soon as Google's window takes focus; the worker finishes the
// sign-in either way, and the popup shows it the next time it opens.
export async function handleGoogleSignIn(): Promise<GoogleSignInResponse> {
  try {
    const session = await signInWithGoogle()
    await completeSignIn(session)
    return { success: true, session }
  } catch (err) {
    if (err instanceof GoogleSignInCancelledError) {
      await takeGoogleSignInError()
      return { success: false, cancelled: true }
    }
    const error = (err instanceof Error && err.message) || 'Google sign-in failed'
    // Usually nobody is listening: the popup closed when Google's window
    // opened. The next panel to open shows it.
    await saveGoogleSignInError(error)
    return { success: false, cancelled: false, error }
  }
}

export async function signOut(accessToken: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  })
}

async function refreshSession(refreshToken: string): Promise<AuthSession> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  if (!res.ok) throw new Error('Session refresh failed')
  return parseSession(await res.json() as Record<string, unknown>)
}

// Returns a valid session (refreshing if near-expiry). Returns null if no session or refresh fails.
export async function ensureValidSession(): Promise<AuthSession | null> {
  const session = await getSession()
  if (!session) return null

  const bufferSecs = 60
  if (session.expires_at > Math.floor(Date.now() / 1000) + bufferSecs) {
    return session
  }

  try {
    const fresh = await refreshSession(session.refresh_token)
    await saveSession(fresh)
    return fresh
  } catch {
    await clearSession()
    return null
  }
}

export async function fetchTier(userId: string, accessToken: string): Promise<string> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/users?select=tier&id=eq.${encodeURIComponent(userId)}&limit=1`,
      { headers: authHeaders(accessToken) },
    )
    if (!res.ok) return 'hosted_free'
    const rows = await res.json() as Array<{ tier: string }>
    return rows[0]?.tier ?? 'hosted_free'
  } catch {
    return 'hosted_free'
  }
}

// kind is the limit the server applied (migration 015): 'starter' or 'weekly'
// for free accounts, 'daily' for Pro's fair-use cap.
export class RateLimitError extends Error {
  readonly code = 'RATE_LIMIT'
  constructor(message: string, readonly kind?: 'starter' | 'weekly' | 'daily') { super(message) }
}

// Pro's daily cap gets its own code so the popup doesn't offer an upgrade to
// someone who is already on Pro.
export function limitErrorCode(err: RateLimitError): 'RATE_LIMIT' | 'FAIR_USE' {
  return err.kind === 'daily' ? 'FAIR_USE' : 'RATE_LIMIT'
}

function rateLimitError(data: Record<string, unknown>): RateLimitError {
  const kind = (data.allowance as { kind?: 'starter' | 'weekly' | 'daily' } | undefined)?.kind
  return new RateLimitError((data.error as string) ?? 'Generation limit reached.', kind)
}

export async function generateViaBackend(job: JobData, accessToken: string, supplemental?: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ job, supplemental: supplemental?.trim() || undefined }),
  })
  const data = await res.json() as Record<string, unknown>
  if (res.status === 429) {
    throw rateLimitError(data)
  }
  // The function sends 200 before the letter is ready (see heartbeatJson in
  // generate/index.ts), so a late failure arrives as { error } with status 200.
  if (!res.ok || data.error) {
    throw new Error((data.error as string) ?? `Server error ${res.status}`)
  }
  const letter = data.letter as string
  if (!letter) throw new Error('Empty response from server')
  return letter
}

export async function uploadResumeToBackend(
  accessToken: string,
  text: string,
  filename: string,
): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/resume`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, filename }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as Record<string, unknown>
    throw new Error((data.error as string) ?? 'Resume sync failed')
  }
}

export async function startBilling(accessToken: string, action: 'checkout' | 'portal'): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/billing`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  })
  // A gateway error (502/504) can come back as an HTML page, not JSON.
  const data = await res.json().catch(() => ({})) as { url?: string; error?: string }
  if (!res.ok || !data.url) throw new Error(data.error ?? 'Could not reach billing. Please try again.')
  return data.url
}

export async function tailorViaBackend(job: JobData, accessToken: string, compact = false, supplemental?: string, trim = false, includeSummary = true, previous?: TailoredResume, onProgress?: (label: string) => void): Promise<TailoredResume> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/tailor`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      // Opts into the NDJSON progress stream; older function versions ignore
      // this and respond with plain JSON, which the fallback below handles.
      Accept: 'application/x-ndjson',
    },
    body: JSON.stringify({ job, compact, supplemental: supplemental?.trim() || undefined, trim, includeSummary, previous }),
  })

  // Pre-stream failures (auth, rate limit, missing resume) and any older
  // non-streaming function version respond with plain JSON.
  const contentType = res.headers.get('content-type') ?? ''
  if (!res.ok || !contentType.includes('ndjson') || !res.body) {
    const data = await res.json().catch(() => ({})) as Record<string, unknown>
    if (res.status === 429) {
      throw rateLimitError(data)
    }
    if (!res.ok) {
      throw new Error((data.error as string) ?? `Server error ${res.status}`)
    }
    const resume = data.resume
    if (!isValidResume(resume)) throw new Error('Invalid response from server. Please try again.')
    return resume
  }

  // NDJSON stream: {type:'start',roles} → {type:'delta',text}* → {type:'done',resume}
  // Deltas only drive the progress label; the authoritative resume (merged and
  // scored server-side) arrives in the done event.
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let lineBuf = ''
  let acc = ''
  let roles = 1
  let final: TailoredResume | null = null

  const handleLine = (line: string): void => {
    const trimmed = line.trim()
    if (!trimmed) return
    let ev: Record<string, unknown>
    try {
      ev = JSON.parse(trimmed) as Record<string, unknown>
    } catch {
      return
    }
    if (ev.type === 'start' && typeof ev.roles === 'number' && ev.roles > 0) {
      roles = ev.roles
    } else if (ev.type === 'delta' && typeof ev.text === 'string') {
      acc += ev.text
      onProgress?.(deriveTailorProgress(acc, roles))
    } else if (ev.type === 'done') {
      if (isValidResume(ev.resume)) final = ev.resume
    } else if (ev.type === 'error') {
      throw new Error((ev.error as string) ?? 'Resume tailoring failed. Please try again.')
    }
  }

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    lineBuf += decoder.decode(value, { stream: true })
    const lines = lineBuf.split('\n')
    lineBuf = lines.pop() ?? ''
    for (const line of lines) handleLine(line)
  }
  handleLine(lineBuf)

  if (!final) throw new Error('Invalid response from server. Please try again.')
  return final
}

export async function saveLetterToBackend(accessToken: string, entry: CoverLetter): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/letters`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as Record<string, unknown>
    throw new Error((data.error as string) ?? 'Failed to save letter')
  }
}

export async function fetchLettersFromBackend(accessToken: string): Promise<CoverLetter[]> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/letters`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Failed to fetch letters')
  const data = await res.json() as { letters: CoverLetter[] }
  return data.letters ?? []
}

export async function fetchApplicationsFromBackend(accessToken: string): Promise<ApplicationRecord[]> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/applications`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Failed to fetch applications')
  const data = await res.json() as { applications: ApplicationRecord[] }
  return data.applications ?? []
}

export async function deleteApplicationFromBackend(accessToken: string, id: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/applications?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as Record<string, unknown>
    throw new Error((data.error as string) ?? 'Failed to delete application')
  }
}

export async function deleteLetterFromBackend(accessToken: string, id: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/letters?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as Record<string, unknown>
    throw new Error((data.error as string) ?? 'Failed to delete letter')
  }
}

function parseSession(data: Record<string, unknown>): AuthSession {
  const user = data.user as Record<string, unknown>
  return {
    access_token: data.access_token as string,
    refresh_token: data.refresh_token as string,
    expires_at:
      (data.expires_at as number) ??
      Math.floor(Date.now() / 1000) + ((data.expires_in as number) ?? 3600),
    user: {
      id: user?.id as string,
      email: user?.email as string,
    },
  }
}
