export function hasSessionCookie(cookie: string): boolean {
  return /(?:^|;\s*)sb-[^=]+-auth-token(?:\.0)?=/.test(cookie)
}
