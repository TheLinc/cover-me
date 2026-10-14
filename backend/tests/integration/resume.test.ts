import { createHash } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  admin, callFunction, createUser, deleteUser, LONG_RESUME_TEXT, mockClaude, parsedResume, RESUME_TEXT, type TestUser, uploadResume, waitForParsedResume,
} from './helpers'

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
    // The limiter's per-account row (see resume/index.ts parseAhead), at its
    // daily cap. Pinned rather than raced, so a minute rolling over can't
    // start a fresh window mid-test.
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
    const newest = await waitForParsedResume(user.id) // the second parse, not delayed
    await sleep(2000) // the first one lands now, and must not write
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
