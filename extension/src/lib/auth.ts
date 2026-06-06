import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, WEB_URL } from './config'
import { clearSession, getSession, saveSession } from './storage'
import type { AuthSession, JobData } from '../types'

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
    throw new Error('Check your email to confirm your account, then sign in.')
  }
  return parseSession(data)
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
      `${SUPABASE_URL}/rest/v1/users?select=tier&id=eq.${userId}&limit=1`,
      { headers: authHeaders(accessToken) },
    )
    if (!res.ok) return 'hosted_free'
    const rows = await res.json() as Array<{ tier: string }>
    return rows[0]?.tier ?? 'hosted_free'
  } catch {
    return 'hosted_free'
  }
}

export class RateLimitError extends Error {
  readonly code = 'RATE_LIMIT'
  constructor(message: string) { super(message) }
}

export async function generateViaBackend(job: JobData, accessToken: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ job }),
  })
  const data = await res.json() as Record<string, unknown>
  if (res.status === 429) {
    throw new RateLimitError((data.error as string) ?? 'Daily limit reached.')
  }
  if (!res.ok) {
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
