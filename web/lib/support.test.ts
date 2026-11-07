import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  createClient: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 'token' } } }) },
  }),
}))

const { sendSupport, siteHost } = await import('./support')

describe('siteHost', () => {
  it('reduces a pasted URL or a bare hostname to the hostname', () => {
    expect(siteHost('https://www.example.com/jobs/1')).toBe('example.com')
    expect(siteHost('  Jobs.Example.COM ')).toBe('jobs.example.com')
    expect(siteHost('boards.greenhouse.io/acme')).toBe('boards.greenhouse.io')
  })

  it('gives nothing for text that is not an address', () => {
    expect(siteHost('')).toBeNull()
    expect(siteHost('not a site')).toBeNull()
    expect(siteHost('localhost')).toBeNull()
  })
})

describe('sendSupport', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('posts the form with the session', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => Response.json({ sent: true }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await sendSupport({ type: 'job_site', message: '', site: 'example.com' })).toBe('sent')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/functions\/v1\/support$/)
    expect(init?.method).toBe('POST')
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer token')
    expect(JSON.parse(init?.body as string)).toEqual({ type: 'job_site', message: '', site: 'example.com' })
  })

  it('tells a rate limit from other failures', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ error: 'x' }, { status: 429 }))
    expect(await sendSupport({ type: 'other', message: 'hi' })).toBe('limited')
    vi.stubGlobal('fetch', async () => new Response('<html>', { status: 502 }))
    expect(await sendSupport({ type: 'other', message: 'hi' })).toBe('failed')
    vi.stubGlobal('fetch', async () => { throw new TypeError('offline') })
    expect(await sendSupport({ type: 'other', message: 'hi' })).toBe('failed')
  })
})
