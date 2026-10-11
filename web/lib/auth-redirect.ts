// Google sign-in leaves the site and comes back to /auth with ?code=…. The
// oauth flag tells /auth this is a sign-in (go to the dashboard), not an
// email confirmation (show "confirmed").
export function oauthRedirectUrl(site: string, plan: string | null): string {
  return `${site}/auth?oauth=1${plan === 'pro' ? '&plan=pro' : ''}`
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

function returnParams(search: string, hash: string): URLSearchParams[] {
  return [new URLSearchParams(search.replace(/^\?/, '')), new URLSearchParams(hash.replace(/^#/, ''))]
}

export function afterOAuth(plan: string | null): string {
  return plan === 'pro' ? '/dashboard?upgrade=1' : '/dashboard'
}
