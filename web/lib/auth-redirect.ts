// Google sign-in leaves the site and comes back to /auth with ?code=…. The
// oauth flag tells /auth this is a sign-in (go to the dashboard), not an
// email confirmation (show "confirmed").
export function oauthRedirectUrl(site: string, plan: string | null): string {
  return `${site}/auth?oauth=1${plan === 'pro' ? '&plan=pro' : ''}`
}

export function afterOAuth(plan: string | null): string {
  return plan === 'pro' ? '/dashboard?upgrade=1' : '/dashboard'
}
