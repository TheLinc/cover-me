import { afterEach, expect, test, vi } from 'vitest'
import { startBilling } from './auth'

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
