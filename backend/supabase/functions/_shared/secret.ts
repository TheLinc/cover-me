// For functions only the developer's tools call (#113, #195). Compares
// digests, so the time taken says nothing about the secret.
export async function secretMatches(given: string | null | undefined, secret: string | undefined): Promise<boolean> {
  if (!secret || !given) return false
  const digest = async (s: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))
  const [a, b] = await Promise.all([digest(secret), digest(given)])
  return a.reduce((diff, byte, i) => diff | (byte ^ b[i]), 0) === 0
}
