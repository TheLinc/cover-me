import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { admin, callFunction, createUser, deleteUser, type TestUser } from './helpers'

// The uninstall page marks the account so the follow-up email skips it (#126),
// and signing in to the extension again clears the mark. No sign-in to mark:
// the extension is gone by then. Rate-limited per client IP like scrape.
let nextIp = 1
const freshIp = () => `198.51.100.${nextIp++ % 250}`
const markRemoved = (body: unknown, ip = freshIp()) =>
  callFunction('extension-removed', { body, headers: { 'cf-connecting-ip': ip } })

async function removedAt(userId: string) {
  const { data } = await admin.from('users').select('extension_removed_at').eq('id', userId).single()
  return data!.extension_removed_at as string | null
}

describe('extension-removed', () => {
  let user: TestUser

  beforeEach(async () => {
    user = await createUser()
  })
  afterEach(() => deleteUser(user))

  it('marks the account, without a sign-in', async () => {
    const res = await markRemoved({ account_id: user.id })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(await removedAt(user.id)).not.toBeNull()
  })

  it('answers an unknown account the same as a real one', async () => {
    const res = await markRemoved({ account_id: randomUUID() })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it.each([
    ['a missing id', {}],
    ['an id that is not a UUID', { account_id: 'not-a-uuid' }],
    ['a UUID with more after it', { account_id: `${randomUUID()}' or 1=1` }],
    ['an id that is not a string', { account_id: 42 }],
  ])('rejects %s with 400', async (_, body) => {
    expect((await markRemoved(body)).status).toBe(400)
  })

  it('changes nothing for a malformed id', async () => {
    await markRemoved({ account_id: `${user.id}x` })
    expect(await removedAt(user.id)).toBeNull()
  })

  it('limits each IP to 5 calls a minute', async () => {
    // Clear of a minute boundary, so the six calls share one window.
    const left = 60_000 - (Date.now() % 60_000)
    if (left < 10_000) await new Promise((r) => setTimeout(r, left + 500))
    const ip = '203.0.113.80'
    for (let i = 0; i < 5; i++) expect((await markRemoved({ account_id: randomUUID() }, ip)).status).toBe(200)
    expect((await markRemoved({ account_id: user.id }, ip)).status).toBe(429)
    expect(await removedAt(user.id)).toBeNull()
  })

  it('is cleared when the extension signs in again and fetches the resume', async () => {
    await markRemoved({ account_id: user.id })
    expect(await removedAt(user.id)).not.toBeNull()
    expect((await callFunction('resume', { token: user.token })).status).toBe(404)
    expect(await removedAt(user.id)).toBeNull()
  })
})
