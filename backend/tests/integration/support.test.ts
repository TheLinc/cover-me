import { afterEach, describe, expect, it } from 'vitest'
import { admin, callFunction, createUser, deleteUser, mockResend, type SentEmail, type TestUser } from './helpers'

// The dashboard's support form (#133): one email to the support inbox through
// Resend (the mock), replying to the signed-in account.

const send = (user: TestUser | null, body: unknown) => callFunction('support', { token: user?.token ?? null, body })

async function sentFrom(user: TestUser): Promise<SentEmail[]> {
  return (await mockResend.sent()).filter((e) => e.body.reply_to === user.email)
}

describe('support', () => {
  const users: TestUser[] = []
  async function user(tier: 'hosted_free' | 'hosted_pro' = 'hosted_free') {
    const u = await createUser(tier)
    users.push(u)
    return u
  }
  afterEach(async () => {
    for (const u of users.splice(0)) await deleteUser(u)
  })

  it('needs a signed-in user', async () => {
    expect((await send(null, { type: 'feature', message: 'hi' })).status).toBe(401)
  })

  it('sends one plain-text email to the inbox, replying to the account', async () => {
    const u = await user()
    const res = await send(u, { type: 'feature', message: '  Dark mode, please.  ', site: 'ignored.com' })
    expect(res.status).toBe(200)

    const [email, ...rest] = await sentFrom(u)
    expect(rest).toEqual([])
    expect(email.authorization).toBe('Bearer re_mock')
    expect(email.body).toMatchObject({
      from: 'Cover Me <support@cover-me.dev>',
      to: ['support@cover-me.dev'],
      reply_to: u.email,
      subject: '[Feature request] from a Free account',
    })
    expect(email.body.html).toBeUndefined()
    expect(email.body.text).toContain('Dark mode, please.')
    expect(email.body.text).toContain(u.id)
    expect(email.body.text).toContain(u.email)
    expect(email.body.text).not.toContain('ignored.com')
  })

  it('carries the job site for a site request, with no message needed', async () => {
    const u = await user()
    expect((await send(u, { type: 'job_site', message: '', site: 'jobs.example.com' })).status).toBe(200)
    const [email] = await sentFrom(u)
    expect(email.body.subject).toBe('[Request a job site] from a Free account')
    expect(email.body.text).toContain('jobs.example.com')
  })

  it('labels Pro and gift-trial accounts', async () => {
    const pro = await user('hosted_pro')
    await send(pro, { type: 'account', message: 'Invoice?' })
    expect((await sentFrom(pro))[0].body.subject).toBe('[Account or billing] from a Pro account')

    const trial = await user('hosted_pro')
    const code = `test-${trial.id}`
    const { error } = await admin.from('trial_codes').insert({
      code, expires_at: new Date(Date.now() + 86_400_000).toISOString(), redeemed_by: trial.id, redeemed_at: new Date().toISOString(),
    })
    expect(error).toBeNull()
    await send(trial, { type: 'problem', message: 'Broken.' })
    expect((await sentFrom(trial))[0].body.subject).toBe("[Something isn't working] from a Trial account")
    await admin.from('trial_codes').delete().eq('code', code)
  })

  it('rejects a malformed request without using up the allowance', async () => {
    const u = await user()
    for (const body of [
      { type: 'praise', message: 'hi' },
      { type: 'other', message: '   ' },
      { type: 'other' },
      { type: 'other', message: 'x'.repeat(1001) },
      { type: 'job_site', message: 'please' },
      { type: 'job_site', site: 'https://example.com/jobs' },
      { type: 'job_site', site: 'not a host' },
      { type: 'job_site', site: `${'a'.repeat(250)}.com` },
    ]) {
      expect((await send(u, body)).status, JSON.stringify(body).slice(0, 80)).toBe(400)
    }
    expect(await sentFrom(u)).toEqual([])
    expect((await send(u, { type: 'other', message: 'x'.repeat(1000) })).status).toBe(200)
  })

  it('allows two a minute', async () => {
    const u = await user()
    expect((await send(u, { type: 'other', message: 'one' })).status).toBe(200)
    expect((await send(u, { type: 'other', message: 'two' })).status).toBe(200)
    expect((await send(u, { type: 'other', message: 'three' })).status).toBe(429)
    expect(await sentFrom(u)).toHaveLength(2)
  })

  it('answers 502 when Resend refuses', async () => {
    const u = await user()
    await mockResend.failNext(500)
    expect((await send(u, { type: 'other', message: 'hello' })).status).toBe(502)
  })
})
