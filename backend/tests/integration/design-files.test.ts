import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { admin, callFunction, createUser, deleteUser, JOB, mockClaude, parsedResume, RESUME_TEXT, type TestUser, uploadResume } from './helpers'

// "Your design" (#131): the resume function's parse on request and a Pro
// account's Word files, and the applications function serving them back.
const hash = (c: string) => c.repeat(64)
const docx = (s: string) => Buffer.from(s).toString('base64')
const uploadFile = (user: TestUser, h: string, content: string) =>
  callFunction('resume', { token: user.token, query: { file: '1' }, body: { hash: h, docx: docx(content) } })
const storedHashes = async (user: TestUser) =>
  ((await admin.from('resume_files').select('hash').eq('user_id', user.id)).data ?? []).map((r) => r.hash).sort()

describe('design files', () => {
  let user: TestUser | undefined

  beforeEach(() => mockClaude.reset())
  afterEach(async () => {
    await deleteUser(user)
    user = undefined
  })

  it('parse: true waits for the parse and returns it, and the same text again reuses it', async () => {
    user = await createUser()
    const first = await callFunction('resume', { token: user.token, body: { text: RESUME_TEXT, filename: 'resume.docx', parse: true } })
    expect((await first.json()).structured).toMatchObject({ name: 'Test Person', experience: expect.any(Array) })
    expect(await parsedResume(user.id)).toBeTruthy()

    await mockClaude.reset()
    const again = await callFunction('resume', { token: user.token, body: { text: RESUME_TEXT, filename: 'resume.docx', parse: true } })
    expect((await again.json()).structured).toMatchObject({ name: 'Test Person' })
    expect(await mockClaude.requests()).toHaveLength(0)
  })

  it("refuses a free account's Word file", async () => {
    user = await createUser()
    await uploadResume(user)
    expect((await uploadFile(user, hash('a'), 'file a')).status).toBe(403)
  })

  it('keeps a Pro Word file encrypted with its parse, and prunes files no tailored resume uses', async () => {
    user = await createUser('hosted_pro')
    await uploadResume(user)
    expect((await uploadFile(user, hash('a'), 'file a')).status).toBe(200)
    const { data } = await admin.from('resume_files').select('docx_encrypted, structured_encrypted').eq('user_id', user.id).single()
    expect(data?.docx_encrypted).not.toContain(docx('file a'))
    expect(data?.structured_encrypted).toBeTruthy()

    // A tailored resume made from file a keeps it; file b, used by nothing, goes when c arrives.
    await callFunction('tailor', { token: user.token, body: { job: JOB, layout: 'yours', sourceHash: hash('a') } })
    await uploadFile(user, hash('b'), 'file b')
    expect(await storedHashes(user)).toEqual([hash('a'), hash('b')])
    await uploadFile(user, hash('c'), 'file c')
    expect(await storedHashes(user)).toEqual([hash('a'), hash('c')])
  })

  it("serves a Pro account's file and marks the tailored resumes made from it", async () => {
    user = await createUser('hosted_pro')
    await uploadResume(user)
    await uploadFile(user, hash('a'), 'file a')
    await callFunction('tailor', { token: user.token, body: { job: JOB, layout: 'yours', sourceHash: hash('a') } })
    await callFunction('tailor', { token: user.token, body: { job: JOB } })

    const file = await (await callFunction('applications', { token: user.token, query: { file: hash('a') } })).json()
    expect(file.docx).toBe(docx('file a'))
    expect(file.structured).toMatchObject({ name: 'Test Person' })
    expect((await callFunction('applications', { token: user.token, query: { file: hash('b') } })).status).toBe(404)

    const { applications } = await (await callFunction('applications', { token: user.token, query: { summary: '1' } })).json()
    const { application } = await (await callFunction('applications', { token: user.token, query: { detail: applications[0].id } })).json()
    const marks = application.tailoredResumes.map((r: { design?: boolean; resume: { sourceHash?: string } }) => [r.design ?? false, r.resume.sourceHash ?? null])
    expect(marks.sort()).toEqual([[false, null], [true, hash('a')]])
  })
})
