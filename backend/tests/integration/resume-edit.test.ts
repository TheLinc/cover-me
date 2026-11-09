import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { admin, callFunction, createUser, deleteUser, JOB, type TestUser } from './helpers'

// A tailored resume edited in the extension's editor tab overwrites the
// account's copy (#118): applications PATCH ?resume=<tailored resume id>.
const job = { title: JOB.title, company: JOB.company, url: JOB.url }
const resume = { name: 'Pat', email: '', experience: [], education: [], atsScore: 81, atsGaps: ['Kafka', 'Go'] }

describe('editing a saved tailored resume', () => {
  const users: TestUser[] = []
  afterEach(async () => { for (const u of users.splice(0)) await deleteUser(u) })
  async function user(tier: 'hosted_free' | 'hosted_pro' = 'hosted_pro') {
    const u = await createUser(tier)
    users.push(u)
    return u
  }
  async function saved(u: TestUser) {
    const id = randomUUID()
    await callFunction('applications', { token: u.token, body: { tailored: [{ id, job, resume, createdAt: new Date().toISOString() }] } })
    return id
  }
  const edit = (u: TestUser, id: string, body: unknown) =>
    callFunction('applications', { token: u.token, method: 'PATCH', query: { resume: id }, body })

  it('overwrites the resume, refreshes the ATS columns and marks it edited', async () => {
    const u = await user()
    const id = await saved(u)
    const edited = { ...resume, name: 'Pat Lee', atsGaps: ['Go'], editedAt: new Date().toISOString() }

    const res = await edit(u, id, { resume: edited })
    expect(res.status).toBe(200)
    const { editedAt } = await res.json()
    expect(Math.abs(Date.parse(editedAt) - Date.now())).toBeLessThan(60_000)

    const detail = await (await callFunction('applications', { token: u.token })).json()
    expect(detail.applications[0].tailoredResumes[0].resume).toMatchObject({ name: 'Pat Lee', atsGaps: ['Go'] })

    const summary = await (await callFunction('applications', { token: u.token, query: { summary: '1' } })).json()
    expect(summary.applications[0].tailoredResumes[0]).toMatchObject({ id, atsScore: 81, atsGaps: ['Go'], editedAt })
  })

  it('an unedited resume has no editedAt in the summary', async () => {
    const u = await user()
    await saved(u)
    const summary = await (await callFunction('applications', { token: u.token, query: { summary: '1' } })).json()
    expect(summary.applications[0].tailoredResumes[0].editedAt).toBeNull()
  })

  // Edited while only in this browser, then saved to the account from History.
  it('an uploaded resume that was edited keeps its editedAt', async () => {
    const u = await user()
    const editedAt = '2026-11-01T12:00:00.000Z'
    await callFunction('applications', { token: u.token, body: { tailored: [{ id: randomUUID(), job, resume: { ...resume, editedAt }, createdAt: editedAt }] } })
    const summary = await (await callFunction('applications', { token: u.token, query: { summary: '1' } })).json()
    expect(Date.parse(summary.applications[0].tailoredResumes[0].editedAt)).toBe(Date.parse(editedAt))
  })

  it("can't edit another account's resume", async () => {
    const owner = await user()
    const id = await saved(owner)
    const res = await edit(await user(), id, { resume: { ...resume, name: 'Mallory' } })
    expect(res.status).toBe(404)
    const { data } = await admin.from('tailored_resumes').select('edited_at').eq('id', id).single()
    expect(data?.edited_at).toBeNull()
  })

  it('free accounts get 403', async () => {
    expect((await edit(await user('hosted_free'), randomUUID(), { resume })).status).toBe(403)
  })

  it.each([
    ['an id that is not a UUID', 'abc', { resume }],
    ['no resume', randomUUID(), {}],
    ['a resume that is not an object', randomUUID(), { resume: 'Pat' }],
    ['a resume over 50,000 characters of JSON', randomUUID(), { resume: { ...resume, pad: 'x'.repeat(50_001) } }],
  ])('returns 400 for %s', async (_, id, body) => {
    expect((await edit(await user(), id, body)).status).toBe(400)
  })
})
