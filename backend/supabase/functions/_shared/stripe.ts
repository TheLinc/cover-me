// Stripe's REST API over fetch, for the billing and account functions.
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
// Unset in production. The local test run points it at the mock server.
const STRIPE_BASE = (Deno.env.get('STRIPE_API_BASE') || 'https://api.stripe.com').replace(/\/+$/, '')

export class StripeError extends Error {
  constructor(readonly status: number, readonly code: string | undefined, path: string) {
    super(`Stripe ${path} returned ${status}${code ? ` (${code})` : ''}`)
  }
}

export async function stripe(
  path: string,
  params: Record<string, string>,
  opts: { method?: 'GET' | 'POST' | 'DELETE'; idempotencyKey?: string } = {},
) {
  const method = opts.method ?? 'POST'
  const headers: Record<string, string> = { Authorization: `Bearer ${STRIPE_SECRET_KEY}` }
  let url = `${STRIPE_BASE}/v1/${path}`
  let body: URLSearchParams | undefined
  if (method === 'POST') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    body = new URLSearchParams(params)
  } else if (Object.keys(params).length) {
    url += `?${new URLSearchParams(params)}`
  }
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey
  const res = await fetch(url, { method, headers, body })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new StripeError(res.status, data?.error?.code, path)
  return data
}
