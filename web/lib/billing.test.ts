import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  createClient: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 'token' } } }) },
  }),
}))

const { firstMonthOffer, openBilling } = await import('./billing')

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

describe('firstMonthOffer', () => {
  afterEach(() => vi.unstubAllGlobals())

  it("returns the open offer's end and name", async () => {
    const offer = { endsAt: '2026-11-20T15:00:00.000Z', name: 'First month offer' }
    vi.stubGlobal('fetch', async () => Response.json({ offer }))
    expect(await firstMonthOffer()).toEqual(offer)
  })

  it('shows no offer when billing fails', async () => {
    vi.stubGlobal('fetch', async () => new Response('<html>502 Bad Gateway</html>', { status: 502 }))
    expect(await firstMonthOffer()).toBeNull()
  })
})
