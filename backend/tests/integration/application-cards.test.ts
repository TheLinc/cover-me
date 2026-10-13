import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { admin, callFunction, createUser, deleteUser, JOB, type TestUser } from './helpers'

// Dashboard cards (spec 2026-10-13-application-cards-design.md): summaries,
// one application in full, and the interview mark.
const job = { title: JOB.title, company: JOB.company, url: JOB.url }
const resume = { name: 'Pat', email: '', experience: [], education: [], atsScore: 81, atsGaps: ['Kafka'] }
const day = (n: number) => new Date(Date.UTC(2026, 6, 1 + n, 12)).toISOString()

describe('application cards', () => {
  const users: TestUser[] = []
  afterEach(async () => { for (const u of users.splice(0)) await deleteUser(u) })
  async function user(tier: 'hosted_free' | 'hosted_pro' = 'hosted_pro') {
    const u = await createUser(tier)
    users.push(u)
    return u
  }

  // One application with a letter and a tailored resume, saved the way the
  // extension's upload saves them.
  async function seeded(u: TestUser, j = job) {
    const l = randomUUID()
    const t = randomUUID()
    const res = await callFunction('applications', { token: u.token, body: {
      letters: [{ id: l, job: j, letter: 'Dear Acme team', createdAt: day(1) }],
      tailored: [{ id: t, job: j, resume, createdAt: day(2) }],
    } })
    expect(res.status).toBe(200)
    const { data } = await admin.from('job_applications').select('id').eq('user_id', u.id).eq('url', j.url).single()
    return { appId: data!.id as string, l, t }
  }

  async function get(u: TestUser, query: Record<string, string>) {
    const res = await callFunction('applications', { token: u.token, query })
    return { status: res.status, body: await res.json() }
  }

  const patch = (u: TestUser, id: string, body: unknown) =>
    callFunction('applications', { token: u.token, method: 'PATCH', query: { id }, body })

  it('summary lists what a card shows and decrypts nothing', async () => {
    const u = await user()
    const { appId, l, t } = await seeded(u)
    await admin.from('cover_letters').update({ letter_encrypted: 'not-a-ciphertext' }).eq('id', l)

    const { body } = await get(u, { summary: '1' })
    expect(body.applications).toEqual([{
      id: appId, title: job.title, company: job.company, url: job.url, createdAt: expect.any(String), interviewAt: null,
      coverLetters: [{ id: l, createdAt: expect.any(String) }],
      tailoredResumes: [{ id: t, createdAt: expect.any(String), atsScore: 81, atsGaps: ['Kafka'] }],
    }])
    // The full list decrypts, so the corrupt letter drops out there.
    expect((await get(u, {})).body.applications[0].coverLetters).toEqual([])
  })

  it("detail returns one of your applications in full, and nobody else's", async () => {
    const a = await user()
    const b = await user()
    const { appId, l, t } = await seeded(a)

    const mine = await get(a, { detail: appId })
    expect(mine.status).toBe(200)
    expect(mine.body.application.interviewAt).toBeNull()
    expect(mine.body.application.coverLetters).toEqual([{ id: l, letter: 'Dear Acme team', createdAt: expect.any(String) }])
    expect(mine.body.application.tailoredResumes[0]).toMatchObject({ id: t, resume: { name: 'Pat', atsScore: 81 } })

    expect((await get(b, { detail: appId })).status).toBe(404)
    expect((await get(a, { detail: 'nope' })).status).toBe(400)
  })

  it('marks and unmarks an interview on your own application only', async () => {
    const a = await user()
    const b = await user()
    const { appId } = await seeded(a)

    const on = await patch(a, appId, { interview: true })
    expect(on.status).toBe(200)
    const { interviewAt } = await on.json() as { interviewAt: string }
    expect(Math.abs(Date.parse(interviewAt) - Date.now())).toBeLessThan(60_000)

    expect((await patch(b, appId, { interview: false })).status).toBe(404)
    const { data } = await admin.from('job_applications').select('interview_at').eq('id', appId).single()
    expect(data?.interview_at).not.toBeNull()

    const off = await patch(a, appId, { interview: false })
    expect(await off.json()).toEqual({ interviewAt: null })
    expect((await patch(a, appId, { interview: 'yes' })).status).toBe(400)
    expect((await patch(a, 'nope', { interview: true })).status).toBe(400)
  })

  it('interview=1 lists only marked applications, alongside search', async () => {
    const u = await user()
    const { appId } = await seeded(u)
    await seeded(u, { title: 'Data Engineer', company: 'Northwind', url: 'https://jobs.example/northwind' })
    await patch(u, appId, { interview: true })

    const marked = await get(u, { summary: '1', interview: '1' })
    expect(marked.body.applications.map((a: { id: string }) => a.id)).toEqual([appId])
    expect((await get(u, { summary: '1', interview: '1', q: 'northwind' })).body.applications).toEqual([])
    expect((await get(u, { summary: '1' })).body.applications).toHaveLength(2)
  })

  it('free accounts get 403', async () => {
    const u = await user('hosted_free')
    expect((await get(u, { detail: randomUUID() })).status).toBe(403)
    expect((await patch(u, randomUUID(), { interview: true })).status).toBe(403)
  })

  it('delete checks the id and only deletes your own application', async () => {
    const a = await user()
    const b = await user()
    const { appId } = await seeded(a)
    const del = (u: TestUser, id: string) => callFunction('applications', { token: u.token, method: 'DELETE', query: { id } })

    expect((await del(a, 'nope')).status).toBe(400)
    expect((await del(b, appId)).status).toBe(404)
    const { data: still } = await admin.from('job_applications').select('id').eq('id', appId)
    expect(still).toHaveLength(1)
    expect((await del(a, appId)).status).toBe(200)
    expect((await del(a, appId)).status).toBe(404)
  })

  it('PATCH refuses an oversized body', async () => {
    const u = await user()
    const { appId } = await seeded(u)
    const res = await callFunction('applications', { token: u.token, method: 'PATCH', query: { id: appId }, body: { interview: true, pad: 'x'.repeat(5_000) } })
    expect(res.status).toBe(400)
  })
})
