import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { admin, callFunction, createUser, deleteUser, JOB, type TestUser } from './helpers'

// Dashboard cards (spec 2026-10-13-application-cards-design.md): summaries,
// one application in full, and its stage.
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
      id: appId, title: job.title, company: job.company, url: job.url, createdAt: expect.any(String), stage: 'applied', stageChangedAt: null,
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
    expect(mine.body.application).toMatchObject({ stage: 'applied', stageChangedAt: null })
    expect(mine.body.application.coverLetters).toEqual([{ id: l, letter: 'Dear Acme team', createdAt: expect.any(String) }])
    expect(mine.body.application.tailoredResumes[0]).toMatchObject({ id: t, resume: { name: 'Pat', atsScore: 81 } })

    expect((await get(b, { detail: appId })).status).toBe(404)
    expect((await get(a, { detail: 'nope' })).status).toBe(400)
  })

  it('moves your own application to another stage, and only to one of the four', async () => {
    const a = await user()
    const b = await user()
    const { appId } = await seeded(a)

    const offer = await patch(a, appId, { stage: 'offer' })
    expect(offer.status).toBe(200)
    const body = await offer.json() as { stage: string; stageChangedAt: string }
    expect(body.stage).toBe('offer')
    expect(Math.abs(Date.parse(body.stageChangedAt) - Date.now())).toBeLessThan(60_000)
    expect((await get(a, { detail: appId })).body.application).toMatchObject({ stage: 'offer', stageChangedAt: body.stageChangedAt })

    expect((await patch(b, appId, { stage: 'closed' })).status).toBe(404)
    expect((await patch(a, appId, { stage: 'nope' })).status).toBe(400)
    expect((await patch(a, appId, { interview: true })).status).toBe(400)
    expect((await patch(a, 'nope', { stage: 'offer' })).status).toBe(400)
    const { data } = await admin.from('job_applications').select('stage').eq('id', appId).single()
    expect(data?.stage).toBe('offer')
  })

  it('stage= lists only applications in those stages, alongside search', async () => {
    const u = await user()
    const { appId: acme } = await seeded(u)
    const { appId: northwind } = await seeded(u, { title: 'Data Engineer', company: 'Northwind', url: 'https://jobs.example/northwind' })
    await seeded(u, { title: 'Analyst', company: 'Initech', url: 'https://jobs.example/initech' })
    await patch(u, acme, { stage: 'interviewing' })
    await patch(u, northwind, { stage: 'offer' })

    const ids = async (query: Record<string, string>) =>
      ((await get(u, { summary: '1', ...query })).body.applications as { id: string }[]).map((a) => a.id).sort()
    expect(await ids({ stage: 'interviewing,offer' })).toEqual([acme, northwind].sort())
    expect(await ids({ stage: 'offer' })).toEqual([northwind])
    expect(await ids({ stage: 'interviewing', q: 'northwind' })).toEqual([])
    expect(await ids({})).toHaveLength(3)
    expect((await get(u, { summary: '1', stage: 'saved' })).status).toBe(400)
  })

  // Free accounts track their jobs; letters and resumes on the server are Pro.
  it('free accounts list, move and delete their applications, but get no documents or upload', async () => {
    const u = await user('hosted_free')
    const { data } = await admin.from('job_applications').insert({ user_id: u.id, ...job }).select('id').single()
    const appId = data!.id as string

    const list = await get(u, { summary: '1' })
    expect(list.status).toBe(200)
    expect(list.body.applications).toMatchObject([{ id: appId, stage: 'applied', coverLetters: [], tailoredResumes: [] }])
    expect((await patch(u, appId, { stage: 'interviewing' })).status).toBe(200)
    expect((await get(u, { summary: '1' })).body.applications[0].stage).toBe('interviewing')

    expect((await get(u, { detail: appId })).status).toBe(403)
    // The extension's history reads the full list: still refused, as before.
    expect((await get(u, {})).status).toBe(403)
    expect((await callFunction('applications', { token: u.token, body: { letters: [], tailored: [] } })).status).toBe(403)

    expect((await callFunction('applications', { token: u.token, method: 'DELETE', query: { id: appId } })).status).toBe(200)
    expect((await get(u, { summary: '1' })).body.applications).toEqual([])
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
    const res = await callFunction('applications', { token: u.token, method: 'PATCH', query: { id: appId }, body: { stage: 'offer', pad: 'x'.repeat(5_000) } })
    expect(res.status).toBe(400)
  })
})
