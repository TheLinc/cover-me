import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const auth = { user: { id: 'u1' } as { id: string } | null, token: 'at' }
vi.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: auth.user } }),
      getSession: async () => ({ data: { session: auth.user ? { access_token: auth.token } : null } }),
    },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { tier: 'hosted_pro' } }) }) }) }),
  }),
}))

const { DELETE, GET, PATCH } = await import('./route')

let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co'
  auth.user = { id: 'u1' }
  fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

const call = () => fetchMock.mock.calls[0] as unknown as [URL | string, RequestInit]

describe('/api/applications', () => {
  it('GET with detail asks the function for that one application', async () => {
    const res = await GET(new NextRequest('http://localhost/api/applications?detail=abc&q=ignored'))
    expect(res.status).toBe(200)
    const [url, init] = call()
    expect(String(url)).toBe('https://x.supabase.co/functions/v1/applications?detail=abc')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer at')
  })

  it('PATCH forwards the interview mark and the function status', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Not found' }), { status: 404 }))
    const res = await PATCH(new NextRequest('http://localhost/api/applications?id=abc', { method: 'PATCH', body: JSON.stringify({ interview: true }) }))
    expect(res.status).toBe(404)
    const [url, init] = call()
    expect(String(url)).toBe('https://x.supabase.co/functions/v1/applications?id=abc')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body as string)).toEqual({ interview: true })
  })

  it('DELETE forwards the id', async () => {
    const res = await DELETE(new NextRequest('http://localhost/api/applications?id=abc', { method: 'DELETE' }))
    expect(res.status).toBe(200)
    expect(String(call()[0])).toBe('https://x.supabase.co/functions/v1/applications?id=abc')
    expect(call()[1].method).toBe('DELETE')
  })

  it('signed out: 401, and nothing is forwarded', async () => {
    auth.user = null
    expect((await DELETE(new NextRequest('http://localhost/api/applications?id=abc', { method: 'DELETE' }))).status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('a function that cannot be reached is a 502', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'))
    expect((await GET(new NextRequest('http://localhost/api/applications?detail=abc'))).status).toBe(502)
  })
})
