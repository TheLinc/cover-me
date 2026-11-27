import { createHash } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  admin, cacheParsedResume, callFunction, createUser, deleteUser, JOB, LONG_RESUME_TEXT, mockClaude, mockPosthog, parsedResume, RESUME_TEXT, type TestUser, uploadResume, waitForParsedResume,
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

  it('round-trips text and filename', async () => {
    await uploadResume(user)
    const res = await callFunction('resume', { token: user.token })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.text).toBe(RESUME_TEXT)
    expect(body.filename).toBe('resume.pdf')
  })

  it('counts a new upload with its file type and plan, never its name, and not a sync of the same text', async () => {
    const upload = () => callFunction('resume', { token: user.token, body: { text: RESUME_TEXT, filename: 'Jane Doe Resume.DOCX' } })
    expect((await upload()).status).toBe(200)
    expect(await mockPosthog.eventsFor('resume_upload', user.id)).toEqual([{
      api_key: 'phc_mock',
      event: 'resume_upload',
      distinct_id: user.id,
      properties: { file_type: 'docx', tier: 'hosted_free', $process_person_profile: false, $geoip_disable: true },
    }])

    expect((await upload()).status).toBe(200)
    expect(await mockPosthog.eventsFor('resume_upload', user.id, (e) => e.length > 1)).toHaveLength(1)
  })

  it('counts an unknown or missing file name as other', async () => {
    await callFunction('resume', { token: user.token, body: { text: RESUME_TEXT } })
    await callFunction('resume', { token: user.token, body: { text: `${RESUME_TEXT}
More.`, filename: 'resume.doc' } })
    const events = await mockPosthog.eventsFor('resume_upload', user.id, (e) => e.length === 2)
    expect(events.map((e) => e.properties.file_type)).toEqual(['other', 'other'])
  })

  it('rejects a file name that is not a string', async () => {
    expect((await callFunction('resume', { token: user.token, body: { text: RESUME_TEXT, filename: 0 } })).status).toBe(400)
  })

  it('sends no count for an account that opted out of usage counts', async () => {
    await admin.from('users').update({ usage_counts_opted_out_at: new Date().toISOString() }).eq('id', user.id)
    expect((await callFunction('resume', { token: user.token, body: { text: RESUME_TEXT, filename: 'resume.pdf' } })).status).toBe(200)
    expect(await mockPosthog.eventsFor('resume_upload', user.id)).toEqual([])
  })

  it('stores ciphertext, never the plaintext resume', async () => {
    await uploadResume(user)
    const { data } = await admin.from('resumes').select('text_encrypted').eq('user_id', user.id).single()
    expect(data?.text_encrypted).toBeTruthy()
    expect(data?.text_encrypted).not.toContain('Initech')
  })

  it('parses a new resume in the background with Haiku 5.5 at low effort, encrypted', async () => {
    await uploadResume(user, RESUME_TEXT, { wait: false })
    const parsed = await waitForParsedResume(user.id)
    expect(parsed).not.toContain('Initech')
    const parses = (await mockClaude.requests()).filter(isParse)
    expect(parses.map((r) => [r.model, r.output_config, r.max_tokens])).toEqual([['claude-haiku-5-5', { effort: 'low' }, 16000]])
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
    // The delayed first parse lands after the second and must not overwrite it (#26).
    await sleep(2000)
    expect((await mockClaude.requests()).filter(isParse)).toHaveLength(2)
    expect(await parsedResume(user.id)).toBe(newest)
  })

  it('leaves the parse to tailor when the background parse fails', async () => {
    await mockClaude.failNext(500)
    await uploadResume(user, RESUME_TEXT, { wait: false })
    await sleep(500)
    expect(await parsedResume(user.id)).toBeNull()
  })

  describe('reader version and upload date (#401)', () => {
    const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')
    const post = (body: Record<string, unknown>) => callFunction('resume', { token: user.token, body: { filename: 'r.pdf', ...body } })
    const get = async () => (await callFunction('resume', { token: user.token })).json()
    const updatedAt = async () => (await admin.from('resumes').select('updated_at').eq('user_id', user.id).single()).data?.updated_at

    it('stores and returns readerVersion and uploadedAt', async () => {
      expect((await post({ text: RESUME_TEXT, readerVersion: 2, uploadedAt: '2026-11-20T10:00:00.000Z' })).status).toBe(200)
      const body = await get()
      expect(body.reader_version).toBe(2)
      expect(Date.parse(body.uploaded_at)).toBe(Date.parse('2026-11-20T10:00:00.000Z'))
    })

    it('a row without them reads as null', async () => {
      await uploadResume(user)
      const body = await get()
      expect(body.reader_version).toBeNull()
      expect(body.uploaded_at).toBeNull()
    })

    it('ignores an out-of-range readerVersion and a future uploadedAt', async () => {
      await post({ text: RESUME_TEXT, readerVersion: 1000, uploadedAt: '2999-01-01T00:00:00.000Z' })
      const body = await get()
      expect(body.reader_version).toBeNull()
      expect(body.uploaded_at).toBeNull()
    })

    it('a same-text re-read only raises reader_version', async () => {
      await post({ text: RESUME_TEXT, readerVersion: 1 })
      await waitForParsedResume(user.id)
      await mockClaude.reset()
      const [before, parse] = [await updatedAt(), await parsedResume(user.id)]
      expect((await post({ text: RESUME_TEXT, readerVersion: 2, reread: true, baseTextHash: sha256(RESUME_TEXT) })).status).toBe(200)
      expect((await get()).reader_version).toBe(2)
      expect(await updatedAt()).toBe(before)
      expect(await parsedResume(user.id)).toBe(parse)
    })

    it('a re-read with new text saves it without a resume_upload event', async () => {
      await post({ text: RESUME_TEXT })
      const res = await post({ text: NEW_TEXT, reread: true, baseTextHash: sha256(RESUME_TEXT), readerVersion: 2 })
      expect(res.status).toBe(200)
      const body = await get()
      expect(body.text).toBe(NEW_TEXT)
      expect(body.reader_version).toBe(2)
      expect(await mockPosthog.eventsFor('resume_upload', user.id, (e) => e.length > 1)).toHaveLength(1)
    })

    it('a re-read keeps the upload date', async () => {
      await post({ text: RESUME_TEXT, uploadedAt: '2026-11-20T10:00:00.000Z' })
      await post({ text: NEW_TEXT, reread: true, baseTextHash: sha256(RESUME_TEXT), readerVersion: 2, uploadedAt: '2026-11-25T10:00:00.000Z' })
      expect(Date.parse((await get()).uploaded_at)).toBe(Date.parse('2026-11-20T10:00:00.000Z'))
    })

    it('a re-read against changed text is refused', async () => {
      await uploadResume(user, NEW_TEXT)
      const res = await post({ text: RESUME_TEXT + '\nMore', reread: true, baseTextHash: sha256(RESUME_TEXT), readerVersion: 2 })
      expect(res.status).toBe(409)
      expect((await get()).text).toBe(NEW_TEXT)
    })

    it('a re-read with no resume in the account is refused', async () => {
      expect((await post({ text: RESUME_TEXT, reread: true, baseTextHash: sha256(RESUME_TEXT) })).status).toBe(409)
    })

    it('a re-read without baseTextHash is refused', async () => {
      await uploadResume(user)
      expect((await post({ text: NEW_TEXT, reread: true })).status).toBe(400)
    })

    it('a same-text sync never lowers reader_version', async () => {
      await post({ text: RESUME_TEXT, readerVersion: 2 })
      await post({ text: RESUME_TEXT, readerVersion: 1 })
      expect((await get()).reader_version).toBe(2)
    })
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
