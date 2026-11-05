import { createHmac } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { admin, callFunction, createUser, deleteUser, type TestUser } from './helpers'

// The token every unsubscribe link carries: the user id and an HMAC of it under
// EMAIL_TOKEN_SECRET (the secret scripts/test-functions.mjs gave the functions).
function unsubscribeToken(userId: string) {
  const mac = createHmac('sha256', process.env.EMAIL_TOKEN_SECRET!).update(`unsubscribe:${userId}`).digest('base64url')
  return `${userId}.${mac}`
}

async function prefs(userId: string) {
  const { data } = await admin
    .from('users')
    .select('product_updates, product_updates_source, product_updates_changed_at, email_unsubscribed_at')
    .eq('id', userId)
    .single()
  return data!
}

// What a mail client sends for one-click unsubscribe (RFC 8058).
function oneClick(token: string) {
  return callFunction('email-preferences', {
    method: 'POST',
    query: { token },
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    rawBody: new TextEncoder().encode('List-Unsubscribe=One-Click'),
  })
}

describe('email-preferences', () => {
  let user: TestUser | undefined

  afterEach(async () => {
    await deleteUser(user)
    user = undefined
  })

  describe('signed in (dashboard toggle, signup choice)', () => {
    it('turns product updates on and off, recording when and from where', async () => {
      user = await createUser()
      const on = await callFunction('email-preferences', { method: 'PATCH', token: user.token, body: { product_updates: true, source: 'dashboard' } })
      expect(on.status).toBe(200)
      expect(await on.json()).toEqual({ product_updates: true })
      const afterOn = await prefs(user.id)
      expect(afterOn).toMatchObject({ product_updates: true, product_updates_source: 'dashboard' })
      expect(afterOn.product_updates_changed_at).not.toBeNull()

      const off = await callFunction('email-preferences', { method: 'PATCH', token: user.token, body: { product_updates: false, source: 'dashboard' } })
      expect(off.status).toBe(200)
      const afterOff = await prefs(user.id)
      expect(afterOff).toMatchObject({ product_updates: false, product_updates_source: 'dashboard' })
      expect(Date.parse(afterOff.product_updates_changed_at!)).toBeGreaterThanOrEqual(Date.parse(afterOn.product_updates_changed_at!))
    })

    it('records a Google signup tick as consent from signup', async () => {
      user = await createUser()
      await callFunction('email-preferences', { method: 'PATCH', token: user.token, body: { product_updates: true, source: 'signup' } })
      expect(await prefs(user.id)).toMatchObject({ product_updates: true, product_updates_source: 'signup' })
    })

    // A signup choice can only come from a signup: an older account opts in
    // from the dashboard, so a replayed signup request can't forge consent.
    it('refuses a signup choice for an account that is not new', async () => {
      user = await createUser()
      await admin.from('users').update({ created_at: new Date(Date.now() - 60 * 60_000).toISOString() }).eq('id', user.id)
      const res = await callFunction('email-preferences', { method: 'PATCH', token: user.token, body: { product_updates: true, source: 'signup' } })
      expect(res.status).toBe(400)
      expect(await prefs(user.id)).toMatchObject({ product_updates: false, product_updates_source: null })
    })

    it('rejects a source the client may not claim, or a value that is not a boolean', async () => {
      user = await createUser()
      for (const body of [
        { product_updates: false, source: 'unsubscribe' },
        { product_updates: true },
        { product_updates: 'yes', source: 'dashboard' },
      ]) {
        const res = await callFunction('email-preferences', { method: 'PATCH', token: user.token, body })
        expect(res.status).toBe(400)
      }
      expect(await prefs(user.id)).toMatchObject({ product_updates: false, product_updates_source: null })
    })

    it('opting back in after an unsubscribe lifts the block', async () => {
      user = await createUser()
      await oneClick(unsubscribeToken(user.id))
      await callFunction('email-preferences', { method: 'PATCH', token: user.token, body: { product_updates: true, source: 'dashboard' } })
      expect(await prefs(user.id)).toMatchObject({ product_updates: true, email_unsubscribed_at: null })
    })
  })

  describe('unsubscribe link (no sign-in)', () => {
    it('unsubscribes with a valid token, at once', async () => {
      user = await createUser()
      await callFunction('email-preferences', { method: 'PATCH', token: user.token, body: { product_updates: true, source: 'dashboard' } })

      const res = await oneClick(unsubscribeToken(user.id))
      expect(res.status).toBe(200)
      const after = await prefs(user.id)
      expect(after).toMatchObject({ product_updates: false, product_updates_source: 'unsubscribe' })
      expect(after.email_unsubscribed_at).not.toBeNull()
    })

    it('refuses a tampered or malformed token and changes nothing', async () => {
      user = await createUser()
      const other = await createUser()
      try {
        const good = unsubscribeToken(user.id)
        const tampered = [
          `${other.id}.${good.split('.')[1]}`, // someone else's id, this user's signature
          `${good.slice(0, -2)}xx`,
          user.id,
          'not-a-token',
        ]
        for (const token of tampered) {
          const res = await oneClick(token)
          expect(res.status).toBe(400)
        }
        expect((await prefs(user.id)).email_unsubscribed_at).toBeNull()
        expect((await prefs(other.id)).email_unsubscribed_at).toBeNull()
      } finally {
        await deleteUser(other)
      }
    })

    it('sends a link opened in a browser to the unsubscribe page, without unsubscribing yet', async () => {
      // Link scanners open every GET, so a GET must never unsubscribe anyone.
      user = await createUser()
      const token = unsubscribeToken(user.id)
      const res = await callFunction('email-preferences', { query: { token }, redirect: 'manual' })
      expect(res.status).toBe(303)
      expect(res.headers.get('location')).toBe(`http://localhost:3000/unsubscribe?token=${encodeURIComponent(token)}`)
      expect((await prefs(user.id)).email_unsubscribed_at).toBeNull()
    })

    it('needs a signed-in token when there is no unsubscribe token', async () => {
      const res = await callFunction('email-preferences', { method: 'PATCH', body: { product_updates: true, source: 'dashboard' } })
      expect(res.status).toBe(401)
    })
  })
})
