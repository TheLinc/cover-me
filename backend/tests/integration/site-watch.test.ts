import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { admin, callFunction, createUser, deleteUser, mockClaude, mockResend, type TestUser } from './helpers'

// The developer runs this when support for a site ships (#195): one email to
// each account waiting on that site, then their rows go.
const notify = (host: unknown, key = process.env.SUPABASE_SERVICE_KEY!) =>
  callFunction('site-watch', { body: { host }, headers: { 'X-Service-Key': key } })

const watching = async (host: string) =>
  (await admin.from('site_watch').select('user_id').eq('host', host)).data!.map((r) => r.user_id).sort()

const sentTo = async (email: string) => (await mockResend.sent()).filter((e) => e.body.to.includes(email))

describe('site-watch', () => {
  const users: TestUser[] = []
  async function watcher(...hosts: string[]) {
    const user = await createUser()
    users.push(user)
    const { error } = await admin.from('site_watch').insert(hosts.map((host) => ({ host, user_id: user.id })))
    if (error) throw new Error(`watch failed: ${error.message}`)
    return user
  }

  beforeEach(() => mockClaude.reset())
  afterEach(async () => {
    for (const u of users.splice(0)) await deleteUser(u)
  })

  it('emails each account waiting on the site once, then deletes their rows only', async () => {
    const [a, b] = [await watcher('jobs.acme.com'), await watcher('jobs.acme.com', 'careers.other.com')]

    const res = await notify('jobs.acme.com')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ sent: 2, failed: 0 })

    for (const user of [a, b]) {
      const mail = await sentTo(user.email)
      expect(mail).toHaveLength(1)
      expect(mail[0].body.subject).toBe('You asked about jobs.acme.com')
      expect(mail[0].body.reply_to).toBe('lincoln@cover-me.dev')
      expect(mail[0].body.text).toContain('jobs.acme.com')
    }
    expect(await watching('jobs.acme.com')).toEqual([])
    expect(await watching('careers.other.com')).toEqual([b.id])
  })

  it('keeps the row of a send Resend refused, for the next run', async () => {
    const user = await watcher('jobs.refused.com')
    await mockResend.failNext(500)

    expect(await (await notify('jobs.refused.com')).json()).toEqual({ sent: 0, failed: 1 })
    expect(await watching('jobs.refused.com')).toEqual([user.id])
  })

  it('only answers the service key, in its own header', async () => {
    const user = await watcher('jobs.locked.com')
    const asBearer = callFunction('site-watch', { body: { host: 'jobs.locked.com' }, token: process.env.SUPABASE_SERVICE_KEY })
    for (const res of [await notify('jobs.locked.com', 'wrong'), await callFunction('site-watch', { body: { host: 'jobs.locked.com' } }), await asBearer]) {
      expect(res.status).toBe(401)
    }
    expect(await sentTo(user.email)).toEqual([])
    expect(await watching('jobs.locked.com')).toEqual([user.id])
  })

  it('rejects a host that is not a hostname', async () => {
    expect((await notify('acme.com/jobs')).status).toBe(400)
  })
})
