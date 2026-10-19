// PostHog's requests from the website (instrumentation-client.ts), sent on to
// PostHog's US cloud through our own domain so ad blockers don't drop them.
// Not a next.config rewrite: that forwards every header, and the browser
// attaches the Supabase session cookie to same-origin requests, so signed-in
// visitors would hand PostHog their access and refresh tokens.
const REQUEST_HEADERS = ['content-type', 'content-encoding', 'user-agent', 'x-forwarded-for']
const RESPONSE_HEADERS = ['content-type', 'cache-control']

async function relay(req: Request): Promise<Response> {
  const { pathname, search } = new URL(req.url)
  // Keeps the trailing slash PostHog's endpoints use (/e/, /flags/)
  const path = pathname.slice('/relay'.length)
  const host = /^\/(static|array)\//.test(path) ? 'us-assets.i.posthog.com' : 'us.i.posthog.com'

  const headers = new Headers()
  for (const name of REQUEST_HEADERS) {
    const value = req.headers.get(name)
    if (value) headers.set(name, value)
  }
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
  let res: Response
  try {
    res = await fetch(`https://${host}${path}${search}`, {
      method: req.method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    // PostHog down or slow: the SDK retries, and Sentry shouldn't get an error per page view
    return new Response(null, { status: 502 })
  }

  // fetch has already decoded the body, so content-encoding and length would lie
  const out = new Headers()
  for (const name of RESPONSE_HEADERS) {
    const value = res.headers.get(name)
    if (value) out.set(name, value)
  }
  // Whatever PostHog returns is served as cover-me.dev, where the session
  // lives: nothing here may render or run as a page of ours
  if (/html|xml/i.test(out.get('content-type') ?? '')) out.set('content-type', 'text/plain')
  out.set('x-content-type-options', 'nosniff')
  out.set('content-security-policy', "sandbox; default-src 'none'")
  return new Response(res.body, { status: res.status, headers: out })
}

export { relay as GET, relay as POST }
