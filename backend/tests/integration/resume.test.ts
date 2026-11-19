import { createHash } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  admin, cacheParsedResume, callFunction, createUser, deleteUser, JOB, LONG_RESUME_TEXT, mockClaude, parsedResume, RESUME_TEXT, type TestUser, uploadResume, waitForParsedResume,
} from './helpers'
import { MOCK_PARSED_RESUME } from '../mock-anthropic'

const isParse = (r: { messages: Array<{ content: string }> }) => r.messages[0].content.startsWith('You are a resume parser')
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const NEW_TEXT = RESUME_TEXT + '\nCertified Kubernetes Administrator'

describe('resume', () => {
  let user: TestUser

  beforeEach(async () => {
    await mockClaude.reset()
    user = await createUser()
  })
  afterEach(() => deleteUser(user))

  it('returns 404 before any upload', async () => {
    const res = await callFunction('resume', { token: user.token })
    expect(res.status).toBe(404)
  })

  it('GET ?parse=1 returns the parsed copy, for taking contact details out of a report (#256)', async () => {
    await uploadResume(user)
    const res = await callFunction('resume', { token: user.token, query: { parse: '1' } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.structured?.experience)).toBe(true)
    expect(typeof body.structured.name).toBe('string')
    expect(body).not.toHaveProperty('text')
    expect((await mockClaude.requests()).filter(isParse)).toHaveLength(0)
  })

  it('GET ?parse=1 parses the resume when no parsed copy is kept yet', async () => {
    await uploadResume(user)
    await admin.from('resumes').update({ structured_encrypted: null }).eq('user_id', user.id)
    const res = await callFunction('resume', { token: user.token, query: { parse: '1' } })
    expect(res.status).toBe(200)
    expect(Array.isArray((await res.json()).structured?.experience)).toBe(true)
    expect((await mockClaude.requests()).filter(isParse)).toHaveLength(1)
  })

  it('GET ?parse=1 returns 404 before any upload', async () => {
    expect((await callFunction('resume', { token: user.token, query: { parse: '1' } })).status).toBe(404)
  })

  it('round-trips text and filename', async () => {
    await uploadResume(user)
    const res = await callFunction('resume', { token: user.token })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.text).toBe(RESUME_TEXT)
    expect(body.filename).toBe('resume.pdf')
  })

  it('stores ciphertext, never the plaintext resume', async () => {
    await uploadResume(user)
    const { data } = await admin.from('resumes').select('text_encrypted').eq('user_id', user.id).single()
    expect(data?.text_encrypted).toBeTruthy()
    expect(data?.text_encrypted).not.toContain('Initech')
  })

  it('parses a new resume in the background with Haiku, encrypted', async () => {
    await uploadResume(user, RESUME_TEXT, { wait: false })
    const parsed = await waitForParsedResume(user.id)
    expect(parsed).not.toContain('Initech')
    expect((await mockClaude.requests()).filter(isParse).map((r) => r.model)).toEqual(['claude-haiku-4-5'])
  })

  it('saves the parse of a full-length resume', async () => {
    await uploadResume(user, LONG_RESUME_TEXT, { wait: false })
    expect(await waitForParsedResume(user.id)).toBeTruthy()
  })

  it('keeps the parsed copy when the same text is uploaded again', async () => {
    await uploadResume(user)
    const before = await parsedResume(user.id)
    await uploadResume(user, RESUME_TEXT, { wait: false })
    await sleep(500)
    expect(await parsedResume(user.id)).toBe(before)
    expect((await mockClaude.requests()).filter(isParse)).toHaveLength(0)
  })

  it('saves a running parse when the same text is uploaded again meanwhile (sign-in sync)', async () => {
    await mockClaude.delayNext(1500)
    await uploadResume(user, RESUME_TEXT, { wait: false })
    await uploadResume(user, RESUME_TEXT, { wait: false })
    await waitForParsedResume(user.id)
    expect((await mockClaude.requests()).filter(isParse)).toHaveLength(1)
  })

  it('parses a quick re-upload of new text too', async () => {
    await uploadResume(user)
    const before = await parsedResume(user.id)
    await uploadResume(user, NEW_TEXT, { wait: false })
    const after = await waitForParsedResume(user.id)
    expect(after).not.toBe(before)
  })

  it('stops parsing ahead once the account reaches its daily limit, and a delete does not reset that', async () => {
    await uploadResume(user)
    // Pinned at the daily cap rather than raced, so a minute rolling over can't
    // start a fresh window mid-test (#26).
    const key = createHash('sha256').update(`resume-parse:${user.id}`).digest('hex')
    await admin.from('scrape_rate_limits').update({ count: 10 }).eq('ip_hash', key).eq('window_kind', 'day')
    await callFunction('resume', { method: 'DELETE', token: user.token })
    await uploadResume(user, NEW_TEXT, { wait: false })
    await sleep(800)
    expect(await parsedResume(user.id)).toBeNull()
    expect((await mockClaude.requests()).filter(isParse)).toHaveLength(0)
  })

  it("doesn't let a slow parse of an older upload overwrite a newer one", async () => {
    await mockClaude.delayNext(1500)
    await uploadResume(user, RESUME_TEXT, { wait: false })
    await uploadResume(user, NEW_TEXT, { wait: false })
    const newest = await waitForParsedResume(user.id)
    await sleep(2000) // the first one lands now, and must not write (#26)
    expect((await mockClaude.requests()).filter(isParse)).toHaveLength(2)
    expect(await parsedResume(user.id)).toBe(newest)
  })

  it('leaves the parse to tailor when the background parse fails', async () => {
    await mockClaude.failNext(500)
    await uploadResume(user, RESUME_TEXT, { wait: false })
    await sleep(500)
    expect(await parsedResume(user.id)).toBeNull()
  })

  it('rejects text over 100 KB', async () => {
    const res = await callFunction('resume', { token: user.token, body: { text: 'x'.repeat(100_001) } })
    expect(res.status).toBe(413)
  })

  it('rejects a missing text field', async () => {
    const res = await callFunction('resume', { token: user.token, body: { filename: 'resume.pdf' } })
    expect(res.status).toBe(400)
  })

  it('deletes the resume', async () => {
    await uploadResume(user)
    const del = await callFunction('resume', { method: 'DELETE', token: user.token })
    expect(del.status).toBe(200)
    const res = await callFunction('resume', { token: user.token })
    expect(res.status).toBe(404)
  })
})

// #197: "Use this order for future resumes?" in the editor.
describe('saving a section order', () => {
  let user: TestUser
  beforeEach(async () => {
    await mockClaude.reset()
    user = await createUser()
  })
  afterEach(() => deleteUser(user))

  const save = (body: unknown) => callFunction('resume', { token: user.token, method: 'PATCH', body })

  it('the next tailored resume uses it', async () => {
    await uploadResume(user)
    const sectionOrder = ['skills', 'other', 'summary', 'experience', 'education']
    const res = await save({ sectionOrder, headings: ['Volunteer Work'] })
    expect(res.status).toBe(200)
    expect((await res.json()).sectionOrder).toEqual(sectionOrder)
    const { resume } = await (await callFunction('tailor', { token: user.token, body: { job: JOB } })).json()
    expect(resume.sectionOrder).toEqual(sectionOrder)
    expect((await mockClaude.requests()).filter(isParse)).toHaveLength(0)
  })

  it('takes an order on a parse from before the link fix (#238), and the tailor that parses it again keeps it', async () => {
    await uploadResume(user)
    await cacheParsedResume(user.id, { ...MOCK_PARSED_RESUME, sectionOrder: ['summary', 'experience', 'other', 'education', 'skills'] })
    const sectionOrder = ['skills', 'other', 'summary', 'experience', 'education']
    expect((await save({ sectionOrder, headings: ['Volunteer Work'] })).status).toBe(200)

    await mockClaude.reset()
    const { resume } = await (await callFunction('tailor', { token: user.token, body: { job: JOB } })).json()
    expect((await mockClaude.requests()).filter(isParse)).toHaveLength(1)
    expect(resume.sectionOrder).toEqual(sectionOrder)
  })

  it('needs a parsed resume', async () => {
    expect((await save({ sectionOrder: ['skills'], headings: [] })).status).toBe(404)
  })

  it('rejects a body without an order', async () => {
    await uploadResume(user)
    expect((await save({ headings: [] })).status).toBe(400)
    expect((await callFunction('resume', { token: user.token, method: 'PATCH', rawBody: new TextEncoder().encode('nope') })).status).toBe(400)
  })
})
