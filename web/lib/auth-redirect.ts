// The oauth flag tells /auth a ?code= return is a Google sign-in, not an email confirmation (#16).
export function oauthRedirectUrl(site: string, plan: string | null, next: string | null = null): string {
  const back = safeNext(next)
  return `${site}/auth?oauth=1${plan === 'pro' ? '&plan=pro' : ''}${back ? `&next=${encodeURIComponent(back)}` : ''}`
}

// Only these paths, so ?next can't send anyone to another site (#25).
export function safeNext(next: string | null): string | null {
  return next && /^(\/dashboard(\/[a-z-]+)*|\/redeem\/[A-Za-z0-9_-]+)$/.test(next) ? next : null
}

// A cancel on Google's consent screen isn't a failure, so /auth shows no error for it (#16).
export function oauthCancelled(search: string, hash: string): boolean {
  return returnParams(search, hash).some((p) => p.get('error') === 'access_denied')
}

export function oauthErrorDescription(search: string, hash: string): string {
  return returnParams(search, hash).map((p) => p.get('error_description') ?? '').find(Boolean) ?? ''
}

// /auth opens on the view an email link names from its first render, so the sign-in form never flashes (#43).
export function hashReturn(hash: string): { view: 'confirmed' | 'reset' | null; error: string } {
  const h = new URLSearchParams(hash.replace(/^#/, ''))
  if (h.get('error')) {
    const code = h.get('error_code')
    if (code === 'otp_expired') return { view: null, error: 'That confirmation link has expired. Sign in or sign up again to get a new one.' }
    if (code === 'access_denied') return { view: null, error: 'This link is invalid or has already been used. Sign in or request a new link.' }
    const desc = h.get('error_description')
    return { view: null, error: desc ? decodeURIComponent(desc.replace(/\+/g, ' ')) : 'Something went wrong. Please try again.' }
  }
  if (!h.get('access_token')) return { view: null, error: '' }
  const type = h.get('type')
  return { view: type === 'signup' ? 'confirmed' : type === 'recovery' ? 'reset' : null, error: '' }
}

function returnParams(search: string, hash: string): URLSearchParams[] {
  return [new URLSearchParams(search.replace(/^\?/, '')), new URLSearchParams(hash.replace(/^#/, ''))]
}

export function afterOAuth(plan: string | null, next: string | null = null): string {
  return plan === 'pro' ? '/dashboard?upgrade=1' : safeNext(next) ?? '/dashboard'
}

export type LinkTokens = { access_token: string; refresh_token: string }

export function hashTokens(hash: string): LinkTokens | null {
  const h = new URLSearchParams(hash.replace(/^#/, ''))
  const access_token = h.get('access_token')
  const refresh_token = h.get('refresh_token')
  const type = h.get('type')
  return !h.get('error') && access_token && refresh_token && (type === 'signup' || type === 'recovery') ? { access_token, refresh_token } : null
}

export function sessionSwitch(incomingId: string | undefined, currentId: string | undefined, sessionStored: boolean): 'set' | 'ask' {
  if (currentId) return incomingId === currentId ? 'set' : 'ask'
  return sessionStored ? 'ask' : 'set'
}
