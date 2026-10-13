export type NavLink = { href: string; label: string }

// Signed-in pages show where you can go in your account, not the landing
// page's sections. A plain module, not SiteNav's client one, so server pages
// can call it too.
export function appLinks(isPro: boolean): NavLink[] {
  return isPro
    ? [{ href: '/dashboard', label: 'Dashboard' }, { href: '/dashboard/applications', label: 'Applications' }]
    : [{ href: '/dashboard', label: 'Dashboard' }]
}
