import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  createClient: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 'token' } } }) },
  }),
}))

const { openBilling } = await import('./billing')

describe('openBilling', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('turns a non-JSON gateway error into a readable message', async () => {
    vi.stubGlobal('fetch', async () => new Response('<html>502 Bad Gateway</html>', { status: 502 }))
    expect(await openBilling('portal')).toEqual({ error: 'Could not reach billing. Please try again.' })
  })

  it("passes through the billing function's reply", async () => {
    vi.stubGlobal('fetch', async () => Response.json({ error: 'No billing account yet.' }, { status: 400 }))
    expect(await openBilling('portal')).toEqual({ error: 'No billing account yet.' })
  })
})
