import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from './route'

afterEach(() => vi.unstubAllGlobals())

function stubFetch() {
  const fetch = vi.fn(async (..._args: unknown[]) => new Response('{}', {
    status: 200,
    headers: { 'content-type': 'application/json', 'content-encoding': 'gzip', 'set-cookie': 'x=1' },
  }))
  vi.stubGlobal('fetch', fetch)
  return fetch
}

describe('/relay', () => {
  it("never forwards the visitor's cookies or auth headers to PostHog", async () => {
    const fetch = stubFetch()
    await POST(new Request('https://www.cover-me.dev/relay/e/?compression=gzip-js', {
      method: 'POST',
      body: 'payload',
      headers: {
        cookie: 'sb-ref-auth-token=secret',
        authorization: 'Bearer secret',
        'content-type': 'text/plain',
        'x-forwarded-for': '203.0.113.7',
      },
    }))
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://us.i.posthog.com/e/?compression=gzip-js')
    const sent = init.headers as Headers
    expect(sent.get('cookie')).toBeNull()
    expect(sent.get('authorization')).toBeNull()
    expect(sent.get('x-forwarded-for')).toBe('203.0.113.7')
    expect(sent.get('content-type')).toBe('text/plain')
  })

  it('sends static and array paths to the assets host, and drops headers it must not pass back', async () => {
    const fetch = stubFetch()
    const res = await GET(new Request('https://www.cover-me.dev/relay/array/phc_x/config.js'))
    expect(fetch.mock.calls[0][0]).toBe('https://us-assets.i.posthog.com/array/phc_x/config.js')
    expect(res.headers.get('content-encoding')).toBeNull()
    expect(res.headers.get('set-cookie')).toBeNull()
    expect(res.headers.get('content-type')).toBe('application/json')
  })

  it('answers 502 instead of throwing when PostHog is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed') }))
    const res = await POST(new Request('https://www.cover-me.dev/relay/e/', { method: 'POST', body: 'x' }))
    expect(res.status).toBe(502)
  })
})
