// Per-IP (per /64 for IPv6) rate limit for functions that take calls without
// an account: scrape and site-request. Counted by the check_scrape_rate_limit
// RPC (migration 014). Never log or store the IP; only its HMAC is stored.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

// Fails closed: a caller that gets 'unavailable' refuses the call, since
// letting calls through unchecked would lift the limit for anyone who can
// provoke the failure. fn: the calling function's name. Each function has its
// own counter per IP; scrape's key is the bare IP, as it was before others
// shared this.
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

// Production sits behind Cloudflare, which sets cf-connecting-ip and replaces
// any value a client sends. Without it, the last x-forwarded-for entry: the
// nearest proxy appends it, and a client can only add entries before it, so
// the first entry is never trusted. With neither, one shared bucket rather
// than no limit.
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
// subscriber usually holds a whole /64, so a per-address limit is free to dodge.
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

// HMAC, not a bare hash: IPv4 is small enough to reverse a plain SHA-256 by
// brute force. The key is derived from ENCRYPTION_KEY with its own label, so
// there's no new secret to set and the AES key itself is never used for this.
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
