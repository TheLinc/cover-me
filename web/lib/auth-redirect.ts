// Google sign-in leaves the site and comes back to /auth with ?code=…. The
// oauth flag tells /auth this is a sign-in (go to the dashboard), not an
// email confirmation (show "confirmed").
export function oauthRedirectUrl(site: string, plan: string | null, next: string | null = null): string {
  const back = safeNext(next)
  return `${site}/auth?oauth=1${plan === 'pro' ? '&plan=pro' : ''}${back ? `&next=${encodeURIComponent(back)}` : ''}`
}

// Where to land after signing in when a dashboard page sent the user here
// (?next=/dashboard/applications, from the extension's History link). Only a
// dashboard path, so the parameter can't send anyone to another site.
export function safeNext(next: string | null): string | null {
  return next && /^\/dashboard(\/[a-z-]+)*$/.test(next) ? next : null
}

// Cancel on Google's consent screen comes back as error=access_denied. It's
// not a failure, so /auth shows no error for it (the extension does the same).
export function oauthCancelled(search: string, hash: string): boolean {
  return returnParams(search, hash).some((p) => p.get('error') === 'access_denied')
}

// Supabase's reason for a failed sign-in, shown instead of a generic retry
// message when it's something retrying won't fix (provider disabled, say).
export function oauthErrorDescription(search: string, hash: string): string {
  return returnParams(search, hash).map((p) => p.get('error_description') ?? '').find(Boolean) ?? ''
}

// An email link sent with the token in the fragment (#access_token=…&type=…,
// or #error=… when it's expired or used). /auth opens on the view this names
// from its first render, so the sign-in form never shows on the way there.
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
