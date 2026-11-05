import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  createClient: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 'token' } } }) },
  }),
}))

const { saveProductUpdates, unsubscribe } = await import('./email-preferences')

describe('saveProductUpdates', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('saves the choice with the session and where it was made', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => Response.json({ product_updates: true }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await saveProductUpdates(true, 'dashboard')).toEqual({ product_updates: true })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/functions\/v1\/email-preferences$/)
    expect(init?.method).toBe('PATCH')
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer token')
    expect(JSON.parse(init?.body as string)).toEqual({ product_updates: true, source: 'dashboard' })
  })

  it('turns a non-JSON gateway error into a readable message', async () => {
    vi.stubGlobal('fetch', async () => new Response('<html>502 Bad Gateway</html>', { status: 502 }))
    expect(await saveProductUpdates(false, 'dashboard')).toEqual({ error: "Couldn't save that. Please try again." })
  })
})

describe('unsubscribe', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('posts the token from the link, with no sign-in', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => Response.json({ unsubscribed: true }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await unsubscribe('u1.sig')).toEqual({ unsubscribed: true })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/functions\/v1\/email-preferences\?token=u1.sig$/)
    expect(init?.method).toBe('POST')
    expect(init?.headers).toBeUndefined()
  })

  it("passes through the function's error", async () => {
    vi.stubGlobal('fetch', async () => Response.json({ error: 'This unsubscribe link is invalid.' }, { status: 400 }))
    expect(await unsubscribe('bad')).toEqual({ error: 'This unsubscribe link is invalid.' })
  })
})
