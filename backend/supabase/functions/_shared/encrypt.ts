// AES-256-GCM encryption for resume and cover letter text.
// ENCRYPTION_KEY env var must be a 64-char hex string (32 bytes).

const KEY_HEX = Deno.env.get('ENCRYPTION_KEY') ?? ''

async function importKey(): Promise<CryptoKey> {
  const bytes = new Uint8Array(KEY_HEX.match(/.{2}/g)!.map((b) => parseInt(b, 16)))
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await importKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return btoa(String.fromCharCode(...combined))
}

// A LIKE pattern for "this exact ciphertext": its first 16 characters are the
// random 12-byte IV, which no other encryption repeats. Matching the whole
// ciphertext instead puts it in the request URL, and a long resume's is too
// long for the gateway (414). Base64 has no % or _, so the prefix is literal.
export function sameCiphertext(encoded: string): string {
  return `${encoded.slice(0, 16)}%`
}

export async function decrypt(encoded: string): Promise<string> {
  const key = await importKey()
  const combined = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(plaintext)
}
