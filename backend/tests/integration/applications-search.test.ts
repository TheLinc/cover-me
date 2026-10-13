import { afterEach, describe, expect, it } from 'vitest'
import { admin, callFunction, createUser, deleteUser, type TestUser } from './helpers'

type App = { id: string; title: string; company: string; createdAt: string }

// Seeds job_applications directly: search only reads these columns.
async function seed(user: TestUser, rows: Array<{ title: string; company: string; createdAt: string }>) {
  const { error } = await admin.from('job_applications').insert(
    rows.map((r) => ({ user_id: user.id, title: r.title, company: r.company, url: null, created_at: r.createdAt })),
  )
  if (error) throw error
}

async function list(user: TestUser, query: Record<string, string> = {}) {
  const res = await callFunction('applications', { token: user.token, query })
  return { status: res.status, body: await res.json() as { applications: App[]; hasMore: boolean; error?: string } }
}

const day = (n: number) => new Date(Date.UTC(2026, 8, 1 + n, 12)).toISOString()

describe('applications search and paging', () => {
  let user: TestUser | undefined
  afterEach(async () => { await deleteUser(user); user = undefined })

  it('with no parameters returns the newest 30 and hasMore', async () => {
    user = await createUser('hosted_pro')
    await seed(user, Array.from({ length: 35 }, (_, i) => ({ title: `Role ${i}`, company: 'Acme', createdAt: day(i) })))
    const { status, body } = await list(user)
    expect(status).toBe(200)
    expect(body.applications).toHaveLength(30)
    expect(body.applications[0].title).toBe('Role 34')
    expect(body.hasMore).toBe(true)
    expect(Object.keys(body.applications[0]).sort()).toEqual(['company', 'coverLetters', 'createdAt', 'id', 'interviewAt', 'tailoredResumes', 'title', 'url'])
  })

  it('pages through everything with before, with no repeats or gaps', async () => {
    user = await createUser('hosted_pro')
    await seed(user, Array.from({ length: 70 }, (_, i) => ({ title: `Role ${i}`, company: 'Acme', createdAt: day(i) })))
    const seen: string[] = []
    let before: string | undefined
    for (let page = 0; page < 5; page++) {
      const { body } = await list(user, before ? { before } : {})
      seen.push(...body.applications.map((a) => a.title))
      if (!body.hasMore) break
      before = body.applications.at(-1)!.createdAt
    }
    expect(seen).toEqual(Array.from({ length: 70 }, (_, i) => `Role ${69 - i}`))
  })

  // The cursor keeps Postgres's microseconds: rounding it to milliseconds would
  // skip a row from the same millisecond.
  it('pages past rows in the same millisecond', async () => {
    user = await createUser('hosted_pro')
    await seed(user, [
      { title: 'Later', company: 'A', createdAt: '2026-09-01T12:00:00.123456Z' },
      { title: 'Earlier', company: 'A', createdAt: '2026-09-01T12:00:00.123200Z' },
    ])
    const first = await list(user, { limit: '1' })
    expect(first.body.applications.map((a) => a.title)).toEqual(['Later'])
    const second = await list(user, { limit: '1', before: first.body.applications[0].createdAt })
    expect(second.body.applications.map((a) => a.title)).toEqual(['Earlier'])
  })

  it('ANDs terms across company and title, case-insensitive', async () => {
    user = await createUser('hosted_pro')
    await seed(user, [
      { title: 'Backend Engineer', company: 'Northwind', createdAt: day(1) },
      { title: 'Frontend Engineer', company: 'Northwind', createdAt: day(2) },
      { title: 'Backend Engineer', company: 'Contoso', createdAt: day(3) },
    ])
    const { body } = await list(user, { q: 'northwind BACKEND' })
    expect(body.applications.map((a) => `${a.company}/${a.title}`)).toEqual(['Northwind/Backend Engineer'])
  })

  it('matches %, _, commas, quotes and parentheses literally', async () => {
    user = await createUser('hosted_pro')
    await seed(user, [
      { title: '100% remote', company: 'A', createdAt: day(1) },
      { title: '100 remote', company: 'B', createdAt: day(2) },
      { title: 'data_eng', company: 'C', createdAt: day(3) },
      { title: 'dataXeng', company: 'D', createdAt: day(4) },
      { title: 'Analyst (contract)', company: "Smith, Jones & O'Brien", createdAt: day(5) },
    ])
    expect((await list(user, { q: '100%' })).body.applications.map((a) => a.company)).toEqual(['A'])
    expect((await list(user, { q: 'data_eng' })).body.applications.map((a) => a.company)).toEqual(['C'])
    for (const q of ['Smith,', "O'Brien", '(contract)']) {
      const r = await list(user, { q })
      expect(r.status).toBe(200)
      expect(r.body.applications.map((a) => a.company)).toEqual(["Smith, Jones & O'Brien"])
    }
  })

  it('drops * instead of treating it as a wildcard', async () => {
    user = await createUser('hosted_pro')
    // As a wildcard, E*r would match Editor; with * dropped it's "Er", which doesn't.
    await seed(user, [{ title: 'Editor', company: 'A', createdAt: day(1) }])
    expect((await list(user, { q: 'Edit*' })).body.applications).toHaveLength(1)
    expect((await list(user, { q: 'E*r' })).body.applications).toHaveLength(0)
  })

  it('bounds by from (inclusive) and to (exclusive)', async () => {
    user = await createUser('hosted_pro')
    await seed(user, [0, 1, 2, 3].map((i) => ({ title: `R${i}`, company: 'A', createdAt: day(i) })))
    const { body } = await list(user, { from: day(1), to: day(3) })
    expect(body.applications.map((a) => a.title)).toEqual(['R2', 'R1'])
  })

  it.each([{ from: 'yesterday' }, { to: 'x' }, { before: '2026-13-45' }, { limit: '0' }, { limit: '51' }, { limit: '2.5' }])(
    'returns 400 for %o', async (query) => {
      user = await createUser('hosted_pro')
      expect((await list(user, query)).status).toBe(400)
    })

  it('honours limit', async () => {
    user = await createUser('hosted_pro')
    await seed(user, Array.from({ length: 6 }, (_, i) => ({ title: `R${i}`, company: 'A', createdAt: day(i) })))
    const { body } = await list(user, { limit: '5' })
    expect(body.applications).toHaveLength(5)
    expect(body.hasMore).toBe(true)
  })

  it('still returns 403 for free users with parameters', async () => {
    user = await createUser()
    expect((await list(user, { q: 'x' })).status).toBe(403)
  })
})
