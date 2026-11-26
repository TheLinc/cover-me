import { afterEach, describe, expect, test, vi } from 'vitest'
import { sendSiteRequest } from './site-request'

afterEach(() => vi.unstubAllGlobals())

const sent = () => {
  const fetch = vi.fn(async (_url: string, _init: RequestInit) => new Response('{"ok":true}'))
  vi.stubGlobal('fetch', fetch)
  return () => fetch.mock.calls[0][1]
}

describe('sendSiteRequest', () => {
  test("sends a watch with the user's token", async () => {
    const init = sent()
    await sendSiteRequest({ kind: 'watch', host: 'jobs.acme.com', watch: true }, 'user-token')
    expect((init().headers as Record<string, string>).Authorization).toBe('Bearer user-token')
    expect(JSON.parse(init().body as string)).toEqual({ kind: 'watch', host: 'jobs.acme.com', watch: true })
  })

  test('sends a site request with no token, so it stays unlinked to the account (#195)', async () => {
    const init = sent()
    await sendSiteRequest({ kind: 'site', host: 'jobs.acme.com' })
    expect(init().headers).not.toHaveProperty('Authorization')
  })
})
