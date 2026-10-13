import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { admin, callFunction, createUser, deleteUser, JOB, type TestUser } from './helpers'

// Local history saved to the account (applications POST; spec 2026-10-13-local-history-upload-design.md).
const job = { title: JOB.title, company: JOB.company, url: JOB.url }
const resume = { name: 'Pat', email: '', experience: [], education: [], atsScore: 81, atsGaps: ['Kafka'] }
const day = (n: number) => new Date(Date.UTC(2026, 6, 1 + n, 12)).toISOString()
type Answer = { letters: string[]; tailored: string[]; failed: string[]; error?: string }

async function post(user: TestUser, body: unknown) {
  const res = await callFunction('applications', { token: user.token, body })
  return { status: res.status, body: await res.json() as Answer }
}

async function letterCount(user: TestUser) {
  const { count } = await admin.from('cover_letters').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
  return count
}

describe('saving local history to the account', () => {
  const users: TestUser[] = []
  afterEach(async () => { for (const u of users.splice(0)) await deleteUser(u) })
  async function user(tier: 'hosted_free' | 'hosted_pro' = 'hosted_pro') {
    const u = await createUser(tier)
    users.push(u)
    return u
  }

  it('free accounts get 403', async () => {
    expect((await post(await user('hosted_free'), { letters: [], tailored: [] })).status).toBe(403)
  })

  it('saves letters and tailored resumes under their local IDs, with their dates', async () => {
    const u = await user()
    const l = randomUUID()
    const t = randomUUID()
    const { status, body } = await post(u, {
      letters: [{ id: l, job, letter: 'Dear Acme team', createdAt: day(2) }],
      tailored: [{ id: t, job, resume, createdAt: day(1) }],
    })
    expect(status).toBe(200)
    expect(body).toEqual({ letters: [l], tailored: [t], failed: [] })

    const { data: tr } = await admin.from('tailored_resumes').select('ats_score, ats_gaps, created_at, resume_json_encrypted').eq('id', t).single()
    expect(tr?.ats_score).toBe(81)
    expect(tr?.ats_gaps).toEqual(['Kafka'])
    expect(Date.parse(tr!.created_at)).toBe(Date.parse(day(1)))
    expect(tr?.resume_json_encrypted).not.toContain('Pat')

    // The oldest entry created the application, so it carries that entry's date.
    const { data: apps } = await admin.from('job_applications').select('created_at').eq('user_id', u.id)
    expect(apps).toHaveLength(1)
    expect(Date.parse(apps![0].created_at)).toBe(Date.parse(day(1)))

    const list = await (await callFunction('applications', { token: u.token })).json()
    expect(list.applications[0].coverLetters[0]).toMatchObject({ id: l, letter: 'Dear Acme team' })
  })

  it('check reports what the account holds and writes nothing', async () => {
    const u = await user()
    const saved = randomUUID()
    await post(u, { letters: [{ id: saved, job, letter: 'x', createdAt: day(1) }] })
    const { body } = await post(u, { check: true, letters: [{ id: saved }, { id: randomUUID() }], tailored: [{ id: randomUUID() }] })
    expect(body).toEqual({ letters: [saved], tailored: [], failed: [] })
    expect(await letterCount(u)).toBe(1)
  })

  it('saving the same IDs again changes nothing', async () => {
    const u = await user()
    const id = randomUUID()
    const entry = { letters: [{ id, job, letter: 'first', createdAt: day(1) }] }
    await post(u, entry)
    const again = await post(u, { letters: [{ id, job, letter: 'second', createdAt: day(1) }] })
    expect(again.body).toEqual({ letters: [id], tailored: [], failed: [] })
    expect(await letterCount(u)).toBe(1)
    const list = await (await callFunction('applications', { token: u.token })).json()
    expect(list.applications[0].coverLetters[0].letter).toBe('first')
  })

  it("never overwrites or claims another account's entry, and leaves no empty application", async () => {
    const a = await user()
    const b = await user()
    const id = randomUUID()
    await post(a, { letters: [{ id, job, letter: 'mine', createdAt: day(1) }] })

    const { status, body } = await post(b, { letters: [{ id, job, letter: 'theirs', createdAt: day(1) }] })
    expect(status).toBe(200)
    expect(body).toEqual({ letters: [], tailored: [], failed: [] })

    const listA = await (await callFunction('applications', { token: a.token })).json()
    expect(listA.applications[0].coverLetters[0].letter).toBe('mine')
    const { data: appsB } = await admin.from('job_applications').select('id').eq('user_id', b.id)
    expect(appsB).toHaveLength(0)
  })

  // Postgres can't index a URL much past 2,700 bytes (job_applications_user_url),
  // and page URLs can carry long tracking parameters.
  it('saves an entry whose URL is too long to index, under a shortened URL', async () => {
    const u = await user()
    const id = randomUUID()
    const longUrl = `https://jobs.example/1?${'x'.repeat(3_000)}`
    const { body } = await post(u, { letters: [{ id, job: { ...job, url: longUrl }, letter: 'x', createdAt: day(1) }] })
    expect(body).toEqual({ letters: [id], tailored: [], failed: [] })
    const { data: apps } = await admin.from('job_applications').select('url').eq('user_id', u.id)
    expect(apps?.[0].url).toBe(longUrl.slice(0, 2_048))
  })

  it('an existing application keeps its date', async () => {
    const u = await user()
    await post(u, { letters: [{ id: randomUUID(), job, letter: 'later', createdAt: day(5) }] })
    await post(u, { letters: [{ id: randomUUID(), job, letter: 'earlier', createdAt: day(1) }] })
    const { data: apps } = await admin.from('job_applications').select('created_at').eq('user_id', u.id)
    expect(apps).toHaveLength(1)
    expect(Date.parse(apps![0].created_at)).toBe(Date.parse(day(5)))
  })

  it('a future or unreadable date becomes the time of the upload', async () => {
    const u = await user()
    const future = randomUUID()
    const unreadable = randomUUID()
    await post(u, { letters: [
      { id: future, job, letter: 'x', createdAt: '2999-01-01T00:00:00Z' },
      { id: unreadable, job: { ...job, url: 'https://jobs.example/2' }, letter: 'x', createdAt: 'soon' },
    ] })
    const { data } = await admin.from('cover_letters').select('created_at').in('id', [future, unreadable])
    for (const row of data ?? []) expect(Math.abs(Date.parse(row.created_at) - Date.now())).toBeLessThan(60_000)
    expect(data).toHaveLength(2)
  })

  it.each([
    ['51 letters', { letters: Array.from({ length: 51 }, () => ({ id: randomUUID(), job, letter: 'x', createdAt: day(1) })) }],
    ['21 tailored resumes', { tailored: Array.from({ length: 21 }, () => ({ id: randomUUID(), job, resume, createdAt: day(1) })) }],
    ['an ID that is not a UUID', { letters: [{ id: 'abc', job, letter: 'x', createdAt: day(1) }] }],
    ['a letter over 20,000 characters', { letters: [{ id: randomUUID(), job, letter: 'x'.repeat(20_001), createdAt: day(1) }] }],
    ['a resume over 50,000 characters of JSON', { tailored: [{ id: randomUUID(), job, resume: { ...resume, pad: 'x'.repeat(50_001) }, createdAt: day(1) }] }],
    ['a body over 1 MB', { letters: [], pad: 'x'.repeat(1_000_001) }],
  ])('returns 400 for %s, saving nothing', async (_, body) => {
    const u = await user()
    expect((await post(u, body)).status).toBe(400)
    expect(await letterCount(u)).toBe(0)
  })
})
