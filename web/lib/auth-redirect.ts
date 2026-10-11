// Google sign-in leaves the site and comes back to /auth with ?code=…. The
// oauth flag tells /auth this is a sign-in (go to the dashboard), not an
// email confirmation (show "confirmed").
export function oauthRedirectUrl(site: string, plan: string | null): string {
  return `${site}/auth?oauth=1${plan === 'pro' ? '&plan=pro' : ''}`
}

// Cancel on Google's consent screen comes back as error=access_denied. It's
// not a failure, so /auth shows no error for it (the extension does the same).
export function oauthCancelled(search: string, hash: string): boolean {
  return [search.replace(/^\?/, ''), hash.replace(/^#/, '')]
    .some((p) => new URLSearchParams(p).get('error') === 'access_denied')
}

export function afterOAuth(plan: string | null): string {
  return plan === 'pro' ? '/dashboard?upgrade=1' : '/dashboard'
}
