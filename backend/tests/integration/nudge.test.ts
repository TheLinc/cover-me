import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { admin, API_URL, callFunction, createUser, deleteUser, mockClaude, mockResend, setUsage, type SentEmail, type TestUser, unsubscribeToken } from './helpers'

// The daily follow-up to accounts that signed up but never generated (#113).
// The scheduler calls it with NUDGE_SECRET; it sends through Resend (the mock).

const runNudge = (secret = process.env.NUDGE_SECRET!) =>
  callFunction('nudge', { method: 'POST', headers: { Authorization: `Bearer ${secret}` } })

const HOUR = 60 * 60_000
async function setAge(userId: string, ms: number) {
  const { error } = await admin.from('users').update({ created_at: new Date(Date.now() - ms).toISOString() }).eq('id', userId)
  if (error) throw new Error(`set age failed: ${error.message}`)
}

async function addResume(userId: string) {
  const { error } = await admin.from('resumes').insert({ user_id: userId, text_encrypted: 'x' })
  if (error) throw new Error(`add resume failed: ${error.message}`)
}

async function sentTo(email: string): Promise<SentEmail[]> {
  return (await mockResend.sent()).filter((e) => e.body.to.includes(email))
}

async function nudgeSentAt(userId: string) {
  const { data } = await admin.from('users').select('nudge_sent_at').eq('id', userId).single()
  return data!.nudge_sent_at as string | null
}

describe('nudge', () => {
  const users: TestUser[] = []
  // An account two days old with no generations: the one this email is for.
  async function signedUpTwoDaysAgo(): Promise<TestUser> {
    const user = await createUser()
    users.push(user)
    await setAge(user.id, 48 * HOUR)
    return user
  }

  beforeEach(async () => {
    await mockClaude.reset()
  })
  afterEach(async () => {
    for (const u of users.splice(0)) await deleteUser(u)
  })

  it('only answers the scheduler', async () => {
    const user = await signedUpTwoDaysAgo()
    for (const res of [await runNudge('wrong'), await callFunction('nudge', { method: 'POST' })]) {
      expect(res.status).toBe(401)
    }
    expect(await sentTo(user.email)).toEqual([])
  })

  it('sends the resume version to an account with a resume, once', async () => {
    const user = await signedUpTwoDaysAgo()
    await addResume(user.id)

    const res = await runNudge()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ enabled: true, failed: 0 })
    expect(body.sent.resume).toBeGreaterThanOrEqual(1)

    const [email, ...rest] = await sentTo(user.email)
    expect(rest).toEqual([])
    expect(email.authorization).toBe('Bearer re_mock')
    expect(email.body).toMatchObject({
      from: 'Lincoln from Cover Me <lincoln@cover-me.dev>',
      reply_to: 'lincoln@cover-me.dev',
      subject: 'Your resume is in. Try it on one job',
    })
    expect(email.body.text).toContain('You added your resume to Cover Me yesterday')
    expect(email.body.text).toContain('press Tailor')
    // "-- " with its space is the signature separator mail clients fold.
    expect(email.body.text).toContain("\nLincoln\n\n-- \nDon't want emails like this?")
    // The HTML copy, in the auth emails' card: heading, opening, numbered steps.
    expect(email.body.html).toContain('>Try it on one job</h1>')
    expect(email.body.html).toContain('You added your resume to Cover Me yesterday but haven&#39;t tailored it to a job yet.')
    expect(email.body.html).toMatch(/3\.<\/strong>&nbsp; Press Tailor\./)
    expect(await nudgeSentAt(user.id)).not.toBeNull()

    await runNudge()
    expect(await sentTo(user.email)).toHaveLength(1)
  })

  it('sends the no-resume version to an account without one', async () => {
    const user = await signedUpTwoDaysAgo()
    expect((await (await runNudge()).json()).sent.no_resume).toBeGreaterThanOrEqual(1)
    const [email] = await sentTo(user.email)
    expect(email.body.subject).toBe('One step left: add your resume')
    expect(email.body.text).toMatch(/^You made a Cover Me account yesterday\. Add your resume in the extension's Settings/)
    expect(email.body.html).toContain('>One step left: add your resume</h1>')
    expect(email.body.html).toContain('add your resume in Settings.')
    expect(email.body.text).toContain('press Tailor')
  })

  it('carries an unsubscribe link and one-click headers that work', async () => {
    const user = await signedUpTwoDaysAgo()
    await runNudge()
    const [email] = await sentTo(user.email)

    const token = encodeURIComponent(unsubscribeToken(user.id))
    expect(email.body.text).toContain(`Unsubscribe: http://localhost:3000/unsubscribe?token=${token}`)
    expect(email.body.html).toContain(`href="http://localhost:3000/unsubscribe?token=${token}"`)
    expect(email.body.headers).toEqual({
      'List-Unsubscribe': expect.stringMatching(new RegExp(`/functions/v1/email-preferences\\?token=${token}>$`)),
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    })

    // The mail client's one-click POST, to the local gateway.
    const oneClick = email.body.headers['List-Unsubscribe'].slice(1, -1).replace(/^https?:\/\/[^/]+/, API_URL)
    const res = await fetch(oneClick, { method: 'POST', body: 'List-Unsubscribe=One-Click', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
    expect(res.status).toBe(200)
    const { data } = await admin.from('users').select('email_unsubscribed_at').eq('id', user.id).single()
    expect(data!.email_unsubscribed_at).not.toBeNull()
  })

  it('skips accounts too new, too old, unconfirmed, on Pro, that generated, or unsubscribed', async () => {
    const tooNew = await signedUpTwoDaysAgo()
    await setAge(tooNew.id, 23 * HOUR)
    const tooOld = await signedUpTwoDaysAgo()
    await setAge(tooOld.id, 8 * 24 * HOUR)
    const generated = await signedUpTwoDaysAgo()
    await setUsage(generated.id, [{ daysAgo: 1, count: 1 }])
    const pro = await signedUpTwoDaysAgo()
    await admin.from('users').update({ tier: 'hosted_pro' }).eq('id', pro.id)
    const unsubscribed = await signedUpTwoDaysAgo()
    await admin.from('users').update({ email_unsubscribed_at: new Date().toISOString() }).eq('id', unsubscribed.id)

    const unconfirmedEmail = `test-unconfirmed-${Date.now()}@cover-me.test`
    const { data } = await admin.auth.admin.createUser({ email: unconfirmedEmail, password: 'password123', email_confirm: false })
    users.push({ id: data.user!.id, email: unconfirmedEmail, token: '' })
    await setAge(data.user!.id, 48 * HOUR)

    const control = await signedUpTwoDaysAgo()
    await runNudge()
    expect(await sentTo(control.email)).toHaveLength(1)
    for (const email of [tooNew.email, tooOld.email, pro.email, generated.email, unsubscribed.email, unconfirmedEmail]) {
      expect(await sentTo(email), email).toEqual([])
    }
  })

  it('leaves a failed send unmarked, so the next run tries again', async () => {
    const user = await signedUpTwoDaysAgo()
    await mockResend.failNext(500)
    const res = await runNudge()
    expect((await res.json()).failed).toBeGreaterThanOrEqual(1)
    expect(await nudgeSentAt(user.id)).toBeNull()

    await runNudge()
    expect(await sentTo(user.email)).toHaveLength(1)
    expect(await nudgeSentAt(user.id)).not.toBeNull()
  })

  // Resend may have delivered it, so it is never sent again.
  it('keeps the claim when a send ends with no answer', async () => {
    const user = await signedUpTwoDaysAgo()
    await mockResend.dropNext()
    expect((await (await runNudge()).json()).failed).toBeGreaterThanOrEqual(1)
    expect(await nudgeSentAt(user.id)).not.toBeNull()

    await runNudge()
    expect(await sentTo(user.email)).toEqual([])
  })
})
