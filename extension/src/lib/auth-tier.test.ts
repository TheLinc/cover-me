import { afterEach, expect, test, vi } from 'vitest'
import { currentTier } from './auth'
import type { AuthSession } from '../types'

const session = { access_token: 'token', user: { id: 'user-1' } } as AuthSession

function fakeLocal(data: Record<string, unknown>) {
  vi.stubGlobal('chrome', { storage: { local: {
    get: async (k: string | string[]) => Object.fromEntries((Array.isArray(k) ? k : [k]).filter((x) => x in data).map((x) => [x, data[x]])),
    set: async (o: Record<string, unknown>) => { Object.assign(data, o) },
  } } })
  return data
}

function serverTier(response: Response | Error) {
  const fetch = vi.fn(async () => { if (response instanceof Error) throw response; return response })
  vi.stubGlobal('fetch', fetch)
  return fetch
}

afterEach(() => vi.unstubAllGlobals())

test('an upgrade made in Checkout counts at once: a cached free tier is checked with the server and saved', async () => {
  const local = fakeLocal({ cachedTier: 'hosted_free' })
  serverTier(new Response(JSON.stringify([{ tier: 'hosted_pro' }]), { status: 200 }))
  expect(await currentTier(session)).toBe('hosted_pro')
  expect(local.cachedTier).toBe('hosted_pro')
})

test('a cached Pro tier makes no network call', async () => {
  fakeLocal({ cachedTier: 'hosted_pro' })
  const fetch = serverTier(new Response('[]', { status: 200 }))
  expect(await currentTier(session)).toBe('hosted_pro')
  expect(fetch).not.toHaveBeenCalled()
})

test('a failed lookup keeps the cached tier', async () => {
  const local = fakeLocal({ cachedTier: 'hosted_free' })
  serverTier(new Error('offline'))
  expect(await currentTier(session)).toBe('hosted_free')
  expect(local.cachedTier).toBe('hosted_free')
})
