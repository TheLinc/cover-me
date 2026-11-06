import { afterEach, describe, expect, it, vi } from 'vitest'

const signOut = vi.fn(async (_opts?: unknown) => ({ error: null }))
vi.mock('@/lib/supabase', () => ({
  createClient: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 'token' } } }), signOut },
  }),
}))

const { deleteAccount } = await import('./account')

describe('deleteAccount', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    signOut.mockClear()
  })

  it('sends DELETE with the session, then signs this browser out', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => Response.json({ deleted: true }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await deleteAccount()).toEqual({ deleted: true })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/functions\/v1\/account$/)
    expect(init?.method).toBe('DELETE')
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer token')
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it("passes on the server's error and stays signed in", async () => {
    vi.stubGlobal('fetch', async () => Response.json({ error: 'Could not cancel your subscription.' }, { status: 502 }))
    expect(await deleteAccount()).toEqual({ error: 'Could not cancel your subscription.' })
    expect(signOut).not.toHaveBeenCalled()
  })

  it('turns a non-JSON gateway error into a readable message', async () => {
    vi.stubGlobal('fetch', async () => new Response('<html>502 Bad Gateway</html>', { status: 502 }))
    expect(await deleteAccount()).toEqual({ error: "Couldn't delete your account. Please try again." })
  })
})
