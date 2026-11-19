// For functions that take calls without an account. Never log or store the IP;
// only its HMAC is stored (#130).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

// Fails closed: letting calls through unchecked would lift the limit for anyone who
// can provoke the failure. scrape's key stays the bare IP, as before others shared this (#130).
export async function checkIpRateLimit(
  supabase: SupabaseClient,
  req: Request,
  fn: string,
  perMinute: number,
  perDay: number,
): Promise<'ok' | 'over' | 'unavailable'> {
  const key = clientKey(req, fn)
  const { data, error } = await supabase.rpc('check_scrape_rate_limit', {
    p_ip_hash: await ipHash(fn === 'scrape' ? key : `${fn}:${key}`),
    p_per_minute: perMinute,
    p_per_day: perDay,
  })
  if (error) {
    console.error(`${fn}: rate limit check failed:`, error.message)
    return 'unavailable'
  }
  return data === true ? 'ok' : 'over'
}

// Cloudflare sets cf-connecting-ip and replaces any client value. Else the last
// x-forwarded-for entry: a client can only add entries before the proxy's (#130).
function clientKey(req: Request, fn: string): string {
  const ip = req.headers.get('cf-connecting-ip')?.trim() ||
    req.headers.get('x-forwarded-for')?.split(',').map((s) => s.trim()).filter(Boolean).at(-1)
  if (!ip) {
    console.warn(`${fn}: no client IP header; using the shared bucket`)
    return 'unknown'
  }
  return rateKey(ip)
}

// IPv4 as is (also when written IPv4-mapped, ::ffff:1.2.3.4). IPv6 by /64: one
// subscriber usually holds a whole /64, so a per-address limit is free to dodge (#130).
function rateKey(ip: string): string {
  const v4 = ip.match(/^(?:::ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/i)
  if (v4) return v4[1]
  if (!ip.includes(':')) return ip
  const addr = ip.split('%')[0].toLowerCase()
  const [head, tail] = addr.split('::')
  const h = head ? head.split(':') : []
  const t = tail ? tail.split(':') : []
  const groups = tail === undefined ? h : [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t]
  return groups.slice(0, 4).map((g) => parseInt(g || '0', 16).toString(16)).join(':') + '::/64'
}

// HMAC, not a bare hash: IPv4 is small enough to brute-force a plain SHA-256. The key
// is derived from ENCRYPTION_KEY, so there's no new secret and the AES key isn't reused (#130).
let hmacKey: Promise<CryptoKey> | undefined
async function ipHash(ip: string): Promise<string> {
  hmacKey ??= (async () => {
    const hex = Deno.env.get('ENCRYPTION_KEY') ?? ''
    const master = await crypto.subtle.importKey(
      'raw', new Uint8Array(hex.match(/.{2}/g)!.map((b) => parseInt(b, 16))), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const derived = await crypto.subtle.sign('HMAC', master, new TextEncoder().encode('scrape-rate-limit-v1'))
    return crypto.subtle.importKey('raw', derived, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  })()
  const mac = await crypto.subtle.sign('HMAC', await hmacKey, new TextEncoder().encode(ip))
  return Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, '0')).join('')
}
