// AES-GCM encryption for API keys stored in chrome.storage.local.
// A random master key is generated on first install and stored alongside the
// encrypted values — this protects against trivial plaintext reads of the
// storage file, but not against someone with full Chrome profile access.
// That's an acceptable trade-off for BYOK: the user owns the risk of their key.

const ALGO = { name: 'AES-GCM', length: 256 } as const
const IV_LEN = 12
const MASTER_KEY_STORAGE = 'encKey'

async function getMasterKey(): Promise<CryptoKey> {
  const { [MASTER_KEY_STORAGE]: stored } = await chrome.storage.local.get(MASTER_KEY_STORAGE)

  if (stored) {
    const raw = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0))
    return crypto.subtle.importKey('raw', raw, ALGO, false, ['encrypt', 'decrypt'])
  }

  const key = await crypto.subtle.generateKey(ALGO, true, ['encrypt', 'decrypt'])
  const raw = await crypto.subtle.exportKey('raw', key)
  const encoded = btoa(String.fromCharCode(...new Uint8Array(raw)))
  await chrome.storage.local.set({ [MASTER_KEY_STORAGE]: encoded })
  return key
}

export async function encryptApiKey(plaintext: string): Promise<string> {
  const key = await getMasterKey()
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN))
  const buf = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, buf)
  const out = new Uint8Array(IV_LEN + ciphertext.byteLength)
  out.set(iv)
  out.set(new Uint8Array(ciphertext), IV_LEN)
  return btoa(String.fromCharCode(...out))
}

export async function decryptApiKey(ciphertext: string): Promise<string> {
  const key = await getMasterKey()
  const data = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0))
  const iv = data.slice(0, IV_LEN)
  const buf = data.slice(IV_LEN)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, buf)
  return new TextDecoder().decode(plain)
}
