import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { admin, callFunction, createUser, deleteUser, JOB, type TestUser } from './helpers'

// Pro cross-device history: the letters and applications functions.
describe('history sync', () => {
  let user: TestUser | undefined

  afterEach(async () => {
    await deleteUser(user)
    user = undefined
  })

  it.each(['letters', 'applications'])('%s: free users get 403', async (name) => {
    user = await createUser()
    const res = await callFunction(name, { token: user.token })
    expect(res.status).toBe(403)
  })

  it('saves a letter, lists it, and groups it under its job application', async () => {
    user = await createUser('hosted_pro')
    const id = randomUUID()

    const save = await callFunction('letters', {
      token: user.token,
      body: { id, job: JOB, letter: 'Dear Acme Team, ...', createdAt: new Date().toISOString() },
    })
    expect(save.status).toBe(200)

    const { data: stored } = await admin.from('cover_letters').select('letter_encrypted').eq('id', id).single()
    expect(stored?.letter_encrypted).not.toContain('Dear Acme')

    const letters = await (await callFunction('letters', { token: user.token })).json()
    expect(letters.letters).toHaveLength(1)
    expect(letters.letters[0]).toMatchObject({ id, letter: 'Dear Acme Team, ...', job: { company: 'Acme', url: JOB.url } })

    const apps = await (await callFunction('applications', { token: user.token })).json()
    expect(apps.applications).toHaveLength(1)
    expect(apps.applications[0].coverLetters.map((c: { id: string }) => c.id)).toEqual([id])
  })

  it('reuses one job application for two letters with the same URL', async () => {
    user = await createUser('hosted_pro')
    for (let i = 0; i < 2; i++) {
      await callFunction('letters', {
        token: user.token,
        body: { id: randomUUID(), job: JOB, letter: `Letter ${i}`, createdAt: new Date().toISOString() },
      })
    }
    const apps = await (await callFunction('applications', { token: user.token })).json()
    expect(apps.applications).toHaveLength(1)
    expect(apps.applications[0].coverLetters).toHaveLength(2)
  })

  it('deleting an application removes its letters', async () => {
    user = await createUser('hosted_pro')
    await callFunction('letters', {
      token: user.token,
      body: { id: randomUUID(), job: JOB, letter: 'Letter', createdAt: new Date().toISOString() },
    })
    const apps = await (await callFunction('applications', { token: user.token })).json()

    const del = await callFunction('applications', { method: 'DELETE', token: user.token, query: { id: apps.applications[0].id } })
    expect(del.status).toBe(200)

    const letters = await (await callFunction('letters', { token: user.token })).json()
    expect(letters.letters).toHaveLength(0)
  })

  it("cannot delete another user's letter", async () => {
    user = await createUser('hosted_pro')
    const other = await createUser('hosted_pro')
    try {
      const id = randomUUID()
      await callFunction('letters', {
        token: other.token,
        body: { id, job: JOB, letter: 'Theirs', createdAt: new Date().toISOString() },
      })
      await callFunction('letters', { method: 'DELETE', token: user.token, query: { id } })
      const { data } = await admin.from('cover_letters').select('id').eq('id', id)
      expect(data).toHaveLength(1)
    } finally {
      await deleteUser(other)
    }
  })
})
