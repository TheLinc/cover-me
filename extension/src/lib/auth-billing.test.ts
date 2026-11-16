import { afterEach, expect, test, vi } from 'vitest'
import { fetchFirstMonthOffer, startBilling } from './auth'

afterEach(() => vi.unstubAllGlobals())

// The body startBilling sends to the billing function.
async function sentBody(...args: Parameters<typeof startBilling>) {
  const fetch = vi.fn(async () => new Response(JSON.stringify({ url: 'https://checkout' }), { status: 200 }))
  vi.stubGlobal('fetch', fetch)
  await startBilling(...args)
  return JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
}

// The billing function's default plan is monthly.
test('checkout with no plan asks for monthly', async () => {
  expect(await sentBody('token', 'checkout')).toEqual({ action: 'checkout', plan: 'monthly' })
})

test('checkout can ask for the quarterly plan', async () => {
  expect(await sentBody('token', 'checkout', 'quarterly')).toEqual({ action: 'checkout', plan: 'quarterly' })
})

// The first-month offer (#213), shown next to the upgrade buttons.
test('fetchFirstMonthOffer asks billing for the open offer and returns it', async () => {
  const offer = { endsAt: '2026-11-20T15:00:00.000Z', name: 'First month offer' }
  const fetch = vi.fn(async () => new Response(JSON.stringify({ offer }), { status: 200 }))
  vi.stubGlobal('fetch', fetch)
  expect(await fetchFirstMonthOffer('token')).toEqual(offer)
  expect(JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toEqual({ action: 'offer' })
})

test('fetchFirstMonthOffer shows nothing when billing fails or is unreachable', async () => {
  vi.stubGlobal('fetch', async () => new Response('<html>502 Bad Gateway</html>', { status: 502 }))
  expect(await fetchFirstMonthOffer('token')).toBeNull()
  vi.stubGlobal('fetch', async () => { throw new TypeError('Failed to fetch') })
  expect(await fetchFirstMonthOffer('token')).toBeNull()
})
