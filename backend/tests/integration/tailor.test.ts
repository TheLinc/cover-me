import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  admin, callFunction, createUser, deleteUser, JOB, mockClaude, quotaUsedToday, setQuotaUsedToday, setUsage, type TestUser, uploadResume,
} from './helpers'
import { MOCK_PARSED_RESUME, MOCK_REWRITTEN_BULLET, MOCK_TAILOR_DELTA } from '../mock-anthropic'

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
    // The line check flags the invented "4 hours to 40 minutes"; only that
    // bullet is rewritten, the rest of the role is untouched.
    expect(resume.experience[0].bullets).toEqual([MOCK_REWRITTEN_BULLET, MOCK_TAILOR_DELTA.experience[0].bullets[1]])
    expect(resume.summary).toBe(MOCK_TAILOR_DELTA.summary)
    // Evidence-backed skills: the category label with real evidence stays, the
    // skill whose evidence isn't in the resume is dropped.
    expect(resume.skills).toBe('TypeScript, Postgres, React, Data Pipelines')
    // 2 of 3 tier-1 keywords covered, 1 of 1 tier-2: 70 * 2/3 + 30 = 76.67 → 77
    expect(resume.atsScore).toBe(77)
    expect(resume.atsGaps).toEqual(['Kafka'])
    expect(await quotaUsedToday(user.id)).toBe(1)
  })

  it('scores an either/or requirement as covered when the resume has the other option', async () => {
    user = await createUser()
    await uploadResume(user)
    // The mock reports Kafka missing; this posting accepts Kafka or Postgres, and the resume has Postgres.
    const job = { ...JOB, description: `${JOB.description} Queue work runs on Kafka or Postgres.` }
    const res = await callFunction('tailor', { token: user.token, body: { job } })
    const { resume } = await res.json()
    expect(resume.atsGaps).toEqual([])
    expect(resume.atsScore).toBe(100)
  })

  it('uses Sonnet 5.5 with adaptive thinking at high effort and fallback, and Haiku 4.5 for the parse', async () => {
    user = await createUser()
    await uploadResume(user)
    await callFunction('tailor', { token: user.token, body: { job: JOB } })

    const requests = await mockClaude.requests()
    const parse = requests.filter((r) => r.messages[0].content.startsWith('You are a resume parser'))
    const sonnet = requests.filter((r) => !r.messages[0].content.startsWith('You are a resume parser'))
    expect(parse.map((r) => r.model)).toEqual(['claude-haiku-4-5'])
    expect(sonnet.length).toBeGreaterThan(0)
    for (const r of sonnet) {
      expect(r.model).toBe('claude-sonnet-5-5')
      expect(r.thinking).toEqual({ type: 'adaptive' })
      expect(r.output_config).toEqual({ effort: 'high' })
      expect(r.max_tokens).toBeGreaterThanOrEqual(8000)
      expect(r.fallbacks).toBe('default')
      expect(r.betaHeader).toBe('server-side-fallback-2026-07-01')
    }
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
    const prompts = (await mockClaude.requests()).map((r) => r.messages[0].content)
    expect(prompts.some((p) => p.startsWith('You are a resume parser'))).toBe(false)
    const checks = ['SKILL CLAIM CHECK', 'RESUME ACCURACY CHECK', 'RESUME LINE REWRITE']
    expect(prompts.filter((p) => !checks.some((c) => p.startsWith(c)))).toHaveLength(1)
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

  it('refuses past the free weekly allowance', async () => {
    user = await createUser()
    await uploadResume(user)
    await setUsage(user.id, [{ daysAgo: 40, count: 10 }, { daysAgo: 0, count: 5 }])
    const res = await callFunction('tailor', { token: user.token, body: { job: JOB } })
    expect(res.status).toBe(429)
    expect((await res.json()).error).toContain("You've used this week's 5 free generations")
    expect(await mockClaude.requests()).toHaveLength(0)
  })

  it('applies the Pro fair-use cap of 25 a day', async () => {
    user = await createUser('hosted_pro')
    await uploadResume(user)
    await setQuotaUsedToday(user.id, 25)
    const res = await callFunction('tailor', { token: user.token, body: { job: JOB } })
    expect(res.status).toBe(429)
    expect((await res.json()).error).toContain("Pro's fair-use limit of 25 generations today")
  })

  // Disconnecting once the streamed rewrite has arrived must not refund it:
  // otherwise a script could read the deltas, drop the connection before
  // "done", and tailor for free indefinitely.
  it('keeps the charge when the client disconnects after the streamed rewrite arrives', async () => {
    user = await createUser()
    await uploadResume(user)
    await mockClaude.streamPause(3000) // the rewrite is still streaming when we hang up
    const abort = new AbortController()
    const res = await callFunction('tailor', {
      token: user.token, body: { job: JOB }, headers: { Accept: 'application/x-ndjson' }, signal: abort.signal,
    })
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let seen = ''
    while (!seen.includes('"type":"delta"')) {
      const { value, done } = await reader.read()
      if (done) break
      seen += decoder.decode(value, { stream: true })
    }
    expect(seen).toContain('"type":"delta"')
    abort.abort()
    await new Promise((r) => setTimeout(r, 5000))
    expect(await quotaUsedToday(user.id)).toBe(1)
  })
})
