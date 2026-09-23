import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  admin, callFunction, createUser, deleteUser, JOB, mockClaude, quotaUsedToday, setQuotaUsedToday, type TestUser, uploadResume,
} from './helpers'
import { MOCK_PARSED_RESUME, MOCK_TAILOR_DELTA } from '../mock-anthropic'

type NdjsonEvent =
  | { type: 'start'; roles: number }
  | { type: 'delta'; text: string }
  | { type: 'done'; resume: Record<string, unknown> }
  | { type: 'error'; error: string }

async function readNdjson(res: Response): Promise<NdjsonEvent[]> {
  const text = await res.text()
  return text.split('\n').filter(Boolean).map((line) => JSON.parse(line))
}

describe('tailor', () => {
  let user: TestUser | undefined

  beforeEach(() => mockClaude.reset())
  afterEach(async () => {
    await deleteUser(user)
    user = undefined
  })

  it('legacy JSON response: merges the delta into the parsed resume and scores it', async () => {
    user = await createUser()
    await uploadResume(user)

    const res = await callFunction('tailor', { token: user.token, body: { job: JOB } })
    expect(res.status).toBe(200)
    const { resume } = await res.json()

    // Immutable fields come from the parse, rewritten content from the delta.
    expect(resume.name).toBe(MOCK_PARSED_RESUME.name)
    expect(resume.experience[0].company).toBe('Initech')
    expect(resume.experience[0].dates).toBe(MOCK_PARSED_RESUME.experience[0].dates)
    expect(resume.experience[0].bullets).toEqual(MOCK_TAILOR_DELTA.experience[0].bullets)
    expect(resume.summary).toBe(MOCK_TAILOR_DELTA.summary)
    // 2 of 3 tier-1 keywords covered, 1 of 1 tier-2: 70 * 2/3 + 30 = 76.67 → 77
    expect(resume.atsScore).toBe(77)
    expect(resume.atsGaps).toEqual(['Kafka'])
    expect(await quotaUsedToday(user.id)).toBe(1)
  })

  it('parses the resume once, then reuses the encrypted cache', async () => {
    user = await createUser()
    await uploadResume(user)

    await callFunction('tailor', { token: user.token, body: { job: JOB } })
    const { data } = await admin.from('resumes').select('structured_encrypted').eq('user_id', user.id).single()
    expect(data?.structured_encrypted).toBeTruthy()
    expect(data?.structured_encrypted).not.toContain('Initech')

    await mockClaude.reset()
    await callFunction('tailor', { token: user.token, body: { job: JOB } })
    const models = (await mockClaude.requests()).map((r) => r.model)
    expect(models.some((m) => m.includes('haiku'))).toBe(false)
    expect(models).toHaveLength(1)
  })

  it('streams NDJSON start, delta and done events when asked', async () => {
    user = await createUser()
    await uploadResume(user)

    const res = await callFunction('tailor', {
      token: user.token,
      body: { job: JOB },
      headers: { Accept: 'application/x-ndjson' },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/x-ndjson')

    const events = await readNdjson(res)
    expect(events[0]).toEqual({ type: 'start', roles: 2 })
    const deltas = events.filter((e) => e.type === 'delta')
    expect(deltas.length).toBeGreaterThan(1)
    const done = events.at(-1)
    expect(done?.type).toBe('done')
    if (done?.type === 'done') expect(done.resume.atsScore).toBe(77)
  })

  it('refunds when the resume parse call fails', async () => {
    user = await createUser()
    await uploadResume(user)
    await mockClaude.failNext(500)

    const res = await callFunction('tailor', { token: user.token, body: { job: JOB } })
    expect(res.status).toBe(502)
    expect(await quotaUsedToday(user.id)).toBe(0)
  })

  it('refunds when the tailor call fails', async () => {
    user = await createUser()
    await uploadResume(user)
    // First run caches the parsed resume, so the next Claude call is the tailor itself.
    await callFunction('tailor', { token: user.token, body: { job: JOB } })
    await mockClaude.failNext(529)

    const res = await callFunction('tailor', {
      token: user.token,
      body: { job: JOB },
      headers: { Accept: 'application/x-ndjson' },
    })
    expect(res.status).toBe(502)
    expect(await quotaUsedToday(user.id)).toBe(1)
  })

  it('saves the tailored resume and ATS score for Pro users', async () => {
    user = await createUser('hosted_pro')
    await uploadResume(user)

    const res = await callFunction('tailor', { token: user.token, body: { job: JOB } })
    expect(res.status).toBe(200)

    const { data } = await admin.from('tailored_resumes').select('ats_score, ats_gaps, job_application_id').eq('user_id', user.id)
    expect(data).toHaveLength(1)
    expect(data?.[0].ats_score).toBe(77)
    expect(data?.[0].ats_gaps).toEqual(['Kafka'])
    expect(data?.[0].job_application_id).toBeTruthy()
  })

  it('does not save history for free users', async () => {
    user = await createUser()
    await uploadResume(user)
    await callFunction('tailor', { token: user.token, body: { job: JOB } })
    const { data } = await admin.from('tailored_resumes').select('id').eq('user_id', user.id)
    expect(data).toHaveLength(0)
  })

  it('returns 429 at the free daily limit', async () => {
    user = await createUser()
    await uploadResume(user)
    await setQuotaUsedToday(user.id, 5)
    const res = await callFunction('tailor', { token: user.token, body: { job: JOB } })
    expect(res.status).toBe(429)
    expect(await mockClaude.requests()).toHaveLength(0)
  })
})
