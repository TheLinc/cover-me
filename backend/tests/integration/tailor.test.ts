import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  admin, cacheParsedResume, callFunction, clearParsedResume, createUser, deleteUser, JOB, LONG_RESUME_TEXT, mockClaude, mockPosthog, quotaUsedToday, setQuotaUsedToday, setUsage, type TestUser, uploadResume,
} from './helpers'
import { MOCK_PARSED_RESUME, MOCK_REWRITTEN_BULLET, MOCK_TAILOR_DELTA, MOCK_THINKING } from '../mock-anthropic'

type NdjsonEvent =
  | { type: 'start'; roles: number }
  | { type: 'delta'; text: string }
  | { type: 'thinking'; text: string }
  | { type: 'done'; resume: Record<string, unknown>; savedId?: string }
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
    // Sections outside the six come through from the parse untouched.
    expect(resume.otherSections).toEqual(MOCK_PARSED_RESUME.otherSections)
    // They print in the uploaded resume's order (#165), taken from its text
    // rather than the model's wrong one, the written summary first.
    expect(resume.sectionOrder).toEqual(['summary', 'experience', 'other', 'education', 'skills'])
    // Evidence-backed skills: the category label with real evidence stays, the
    // skill whose evidence isn't in the resume is dropped.
    expect(resume.skills).toBe('TypeScript, Postgres, React, Data Pipelines')
    // 2 of 3 tier-1 keywords covered, 1 of 1 tier-2: 70 * 2/3 + 30 = 76.67 → 77
    expect(resume.atsScore).toBe(77)
    expect(resume.atsGaps).toEqual(['Kafka'])
    expect(await quotaUsedToday(user.id)).toBe(1)
  })

  // #171: what the user typed in the editor is theirs on Regenerate. The mock
  // adds Kafka with evidence the resume lacks, and the line check flags its
  // "4 hours to 40 minutes" bullet; an edited previous that has both keeps them.
  describe('regenerating', () => {
    const typed = MOCK_TAILOR_DELTA.experience[0].bullets[0]
    const experience = [{ ...MOCK_PARSED_RESUME.experience[0], bullets: [typed, 'Maintained customer dashboard'] }, MOCK_PARSED_RESUME.experience[1]]
    const previous = { ...MOCK_PARSED_RESUME, experience, skills: 'TypeScript, Postgres, React, Kafka', atsGaps: [] }
    const revisionPrompt = async () => (await mockClaude.requests()).map((r) => r.messages[0].content).find((p) => p.includes('REVISION MODE'))
    const regenerate = async (prev: Record<string, unknown>) => {
      user = await createUser()
      await uploadResume(user)
      return (await (await callFunction('tailor', { token: user.token, body: { job: JOB, previous: prev } })).json()).resume
    }

    it('keeps a posting-only skill and a bullet the user wrote in the editor', async () => {
      const resume = await regenerate({ ...previous, editedAt: '2026-11-09T00:00:00Z' })
      expect(resume.skills).toBe('TypeScript, Postgres, React, Data Pipelines, Kafka')
      expect(resume.experience[0].bullets[0]).toBe(typed)
      expect(await revisionPrompt()).toContain('includes edits and notes the candidate made themselves')
      // Marked, so the next Regenerate, which starts from this result, trusts it too.
      expect(resume.hasEdits).toBe(true)
      expect(resume.editedAt).toBeUndefined()
    })

    it('a second Regenerate, from a result marked hasEdits, still keeps them', async () => {
      const resume = await regenerate({ ...previous, hasEdits: true })
      expect(resume.skills).toBe('TypeScript, Postgres, React, Data Pipelines, Kafka')
      expect(resume.experience[0].bullets[0]).toBe(typed)
      expect(resume.hasEdits).toBe(true)
    })

    it('keeps a bullet the user added and a title they fixed in the editor', async () => {
      // The mock returns 2 bullets for a role the user grew to 3; a count that
      // doesn't fit keeps the version they saw, not the upload's 2.
      const added = 'Wrote the on-call runbook'
      const grown = [{ ...MOCK_PARSED_RESUME.experience[0], title: 'Senior Software Engineer', bullets: [...MOCK_PARSED_RESUME.experience[0].bullets, added] }, MOCK_PARSED_RESUME.experience[1]]
      const resume = await regenerate({ ...MOCK_PARSED_RESUME, experience: grown, editedAt: '2026-11-09T00:00:00Z' })
      expect(resume.experience[0].bullets).toEqual(grown[0].bullets)
      expect(resume.experience[0].title).toBe('Senior Software Engineer')
    })

    it('a summary the user deleted stays deleted', async () => {
      const { summary: _s, ...noSummary } = previous as typeof previous & { summary?: string }
      expect((await regenerate({ ...noSummary, editedAt: '2026-11-09T00:00:00Z' })).summary).toBeUndefined()
      expect((await regenerate(noSummary)).summary).toBe(MOCK_TAILOR_DELTA.summary)
    })

    it('an unedited previous is checked as before', async () => {
      const resume = await regenerate({ ...previous, sectionOrder: ['skills', 'experience'] })
      expect(resume.skills).toBe('TypeScript, Postgres, React, Data Pipelines')
      // The order comes from the upload's parse, not the previous resume.
      expect(resume.sectionOrder).toEqual(['summary', 'experience', 'other', 'education', 'skills'])
      expect(resume.experience[0].bullets[0]).toBe(MOCK_REWRITTEN_BULLET)
      expect(await revisionPrompt()).not.toContain('includes edits and notes')
      expect(resume.hasEdits).toBeUndefined()
    })

    it("a term only in an edited previous's gap list is still dropped", async () => {
      const resume = await regenerate({ ...MOCK_PARSED_RESUME, atsGaps: ['Kafka'], atsGapsBeforeEdits: ['Kafka'], editedAt: '2026-11-09T00:00:00Z' })
      expect(resume.skills).toBe('TypeScript, Postgres, React, Data Pipelines')
    })
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
    await clearParsedResume(user.id) // so tailor parses it itself
    await callFunction('tailor', { token: user.token, body: { job: JOB } })

    const requests = await mockClaude.requests()
    const parse = requests.filter((r) => r.messages[0].content.startsWith('You are a resume parser'))
    const sonnet = requests.filter((r) => !r.messages[0].content.startsWith('You are a resume parser'))
    expect(parse.map((r) => r.model)).toEqual(['claude-haiku-4-5'])
    expect(sonnet.length).toBeGreaterThan(0)
    for (const r of sonnet) {
      expect(r.model).toBe('claude-sonnet-5-5')
      // The tailor call streams a thinking summary for the popup; the checks don't.
      expect(r.thinking).toEqual(r.stream ? { type: 'adaptive', display: 'summarized' } : { type: 'adaptive' })
      expect(r.output_config).toEqual({ effort: 'high' })
      expect(r.max_tokens).toBeGreaterThanOrEqual(8000)
      expect(r.fallbacks).toBe('default')
      expect(r.betaHeader).toBe('server-side-fallback-2026-07-01')
    }
  })

  it('parses the resume once when it has no parsed copy, then reuses the encrypted cache', async () => {
    user = await createUser()
    await uploadResume(user)
    await clearParsedResume(user.id)

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

  it.each(['otherSections', 'sectionOrder'] as const)('parses again, once, a cached parse from before %s', async (field) => {
    user = await createUser()
    await uploadResume(user)
    const { [field]: _f, ...old } = MOCK_PARSED_RESUME
    const isParse = (p: string) => p.startsWith('You are a resume parser')
    const prompts = async () => (await mockClaude.requests()).map((r) => r.messages[0].content)

    await cacheParsedResume(user.id, { ...MOCK_PARSED_RESUME, otherSections: [], sectionOrder: [] })
    await callFunction('tailor', { token: user.token, body: { job: JOB } })
    expect((await prompts()).filter(isParse)).toHaveLength(0)

    await cacheParsedResume(user.id, old)
    await mockClaude.reset()
    const res = await callFunction('tailor', { token: user.token, body: { job: JOB } })
    expect((await prompts()).filter(isParse)).toHaveLength(1)
    const { resume } = await res.json()
    expect(resume.otherSections).toEqual(MOCK_PARSED_RESUME.otherSections)
    expect(resume.sectionOrder).toEqual(['summary', 'experience', 'other', 'education', 'skills'])

    await mockClaude.reset()
    await callFunction('tailor', { token: user.token, body: { job: JOB } })
    expect((await prompts()).filter(isParse)).toHaveLength(0)
  })

  it('a cached parse from before sectionOrder keeps its content and takes only the order, so a Word design checked against it still lines up', async () => {
    user = await createUser()
    await uploadResume(user)
    const { sectionOrder: _o, ...old } = MOCK_PARSED_RESUME
    const education = [{ ...old.education[0], institution: 'State University of Somewhere' }]
    await cacheParsedResume(user.id, { ...old, education })
    const { resume } = await (await callFunction('tailor', { token: user.token, body: { job: JOB } })).json()
    expect(resume.education).toEqual(education)
    expect(resume.sectionOrder).toEqual(['summary', 'experience', 'other', 'education', 'skills'])
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
    // The thinking summary comes through ahead of the text.
    const thinking = events.filter((e) => e.type === 'thinking')
    expect(thinking.map((e) => e.type === 'thinking' && e.text)).toEqual(MOCK_THINKING)
    expect(events.findIndex((e) => e.type === 'thinking')).toBeLessThan(events.findIndex((e) => e.type === 'delta'))
    const done = events.at(-1)
    expect(done?.type).toBe('done')
    if (done?.type === 'done') expect(done.resume.atsScore).toBe(77)
  })

  it('caches its own parse of a full-length resume', async () => {
    user = await createUser()
    await uploadResume(user, LONG_RESUME_TEXT)
    await clearParsedResume(user.id)
    await callFunction('tailor', { token: user.token, body: { job: JOB } })
    const { data } = await admin.from('resumes').select('structured_encrypted').eq('user_id', user.id).single()
    expect(data?.structured_encrypted).toBeTruthy()
  })

  it('refunds when the resume parse call fails', async () => {
    user = await createUser()
    await uploadResume(user)
    await clearParsedResume(user.id)
    await mockClaude.failNext(500)

    const res = await callFunction('tailor', { token: user.token, body: { job: JOB } })
    expect(res.status).toBe(502)
    expect(await quotaUsedToday(user.id)).toBe(0)
  })

  it('tailors from a cached parse without an order when the parse that would add it fails', async () => {
    user = await createUser()
    await uploadResume(user)
    const { sectionOrder: _o, ...old } = MOCK_PARSED_RESUME
    await cacheParsedResume(user.id, old)
    await mockClaude.failNext(500)

    const res = await callFunction('tailor', { token: user.token, body: { job: JOB } })
    expect(res.status).toBe(200)
    const { resume } = await res.json()
    expect(resume.otherSections).toEqual(MOCK_PARSED_RESUME.otherSections)
    expect(resume.sectionOrder).toBeUndefined()
  })

  it('refunds when the tailor call fails', async () => {
    user = await createUser()
    await uploadResume(user)
    // The upload already parsed the resume, so the next Claude call is the tailor itself.
    await mockClaude.failNext(529)

    const res = await callFunction('tailor', {
      token: user.token,
      body: { job: JOB },
      headers: { Accept: 'application/x-ndjson' },
    })
    expect(res.status).toBe(200)
    expect(await readNdjson(res)).toEqual([{ type: 'error', error: 'AI generation failed. Please try again.' }])
    expect(await quotaUsedToday(user.id)).toBe(0)
  })

  it('streams before an uncached parse finishes, so a slow parse never holds back the response', async () => {
    user = await createUser()
    await uploadResume(user)
    await clearParsedResume(user.id)
    await mockClaude.delayNext(5000) // the parse

    const started = Date.now()
    const res = await callFunction('tailor', { token: user.token, body: { job: JOB }, headers: { Accept: 'application/x-ndjson' } })
    expect(Date.now() - started).toBeLessThan(4000)
    expect(res.headers.get('content-type')).toContain('application/x-ndjson')
    const events = await readNdjson(res)
    expect(events[0]).toEqual({ type: 'start', roles: 2 })
    expect(events.at(-1)?.type).toBe('done')
  })

  it('streams an error and refunds when the parse fails inside the stream', async () => {
    user = await createUser()
    await uploadResume(user)
    await clearParsedResume(user.id)
    await mockClaude.failNext(500)

    const res = await callFunction('tailor', { token: user.token, body: { job: JOB }, headers: { Accept: 'application/x-ndjson' } })
    expect(await readNdjson(res)).toEqual([{ type: 'error', error: 'Could not process your resume. Please try again.' }])
    expect(await quotaUsedToday(user.id)).toBe(0)
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

  it("tailored in the user's Word file: the hash goes on the result and the Pro copy, and the run is counted", async () => {
    user = await createUser('hosted_pro')
    await uploadResume(user)
    const sourceHash = 'f'.repeat(64)

    const res = await callFunction('tailor', { token: user.token, body: { job: JOB, trim: true, layout: 'yours', fellBack: false, sourceHash } })
    expect((await res.json()).resume.sourceHash).toBe(sourceHash)
    const { data } = await admin.from('tailored_resumes').select('source_hash').eq('user_id', user.id)
    expect(data?.[0].source_hash).toBe(sourceHash)

    // Sent behind the response.
    let events = await mockPosthog.events()
    for (let i = 0; i < 20 && events.length === 0; i++) events = await new Promise((r) => setTimeout(r, 100)).then(mockPosthog.events)
    expect(events).toEqual([{
      api_key: 'phc_mock',
      event: 'tailor_run',
      distinct_id: user.id,
      properties: { tier: 'hosted_pro', compact: false, trim: true, includeSummary: true, layout: 'yours', fellBack: false, $process_person_profile: false, $geoip_disable: true },
    }])
  })

  it('an account that opted out of usage counts sends nothing to PostHog', async () => {
    user = await createUser()
    await uploadResume(user)
    await admin.from('users').update({ usage_counts_opted_out_at: new Date().toISOString() }).eq('id', user.id)

    const res = await callFunction('tailor', { token: user.token, body: { job: JOB } })
    expect(res.status).toBe(200)
    // The count would be sent behind the response: give it the same 2 s the
    // counted test waits.
    await new Promise((r) => setTimeout(r, 2000))
    expect((await mockPosthog.events()).filter((e) => e.event === 'tailor_run' && e.distinct_id === user!.id)).toEqual([])
  })

  it('a run that fell back to the Cover Me layout keeps no hash', async () => {
    user = await createUser('hosted_pro')
    await uploadResume(user)
    const res = await callFunction('tailor', { token: user.token, body: { job: JOB, layout: 'yours', fellBack: true, sourceHash: 'f'.repeat(64) } })
    expect((await res.json()).resume.sourceHash).toBeUndefined()
    const { data } = await admin.from('tailored_resumes').select('source_hash').eq('user_id', user.id)
    expect(data?.[0].source_hash).toBeNull()
  })

  it("puts a free account's job on the board, but keeps its resume out of the account", async () => {
    user = await createUser()
    await uploadResume(user)
    await callFunction('tailor', { token: user.token, body: { job: JOB } })

    const res = await callFunction('applications', { token: user.token, query: { summary: '1' } })
    const { applications } = await res.json()
    expect(applications).toHaveLength(1)
    expect(applications[0]).toMatchObject({ title: JOB.title, url: JOB.url, stage: 'applied', tailoredResumes: [] })
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

  // A bad request is rejected before anything is charged, so it gets its real
  // error even when the allowance is used up.
  it('rejects an invalid request with 400 before checking the allowance', async () => {
    user = await createUser()
    await uploadResume(user)
    await setUsage(user.id, [{ daysAgo: 40, count: 10 }, { daysAgo: 0, count: 5 }])
    const res = await callFunction('tailor', { token: user.token, body: { job: { title: 'Engineer' } } })
    expect(res.status).toBe(400)
    expect(await quotaUsedToday(user.id)).toBe(5)
  })

  // A dropped connection to Anthropic (not an HTTP error) must refund too.
  it('refunds when the connection to Claude drops', async () => {
    user = await createUser()
    await uploadResume(user)
    await mockClaude.dropNextStream()
    const res = await callFunction('tailor', { token: user.token, body: { job: JOB } })
    expect(res.status).toBe(502)
    expect(await quotaUsedToday(user.id)).toBe(0)
  })

  it('stores the Pro copy under the local ID and returns it as savedId', async () => {
    user = await createUser('hosted_pro')
    await uploadResume(user)
    const localId = randomUUID()
    const res = await callFunction('tailor', { token: user.token, body: { job: JOB, localId } })
    expect((await res.json()).savedId).toBe(localId)
    const { data } = await admin.from('tailored_resumes').select('id').eq('user_id', user.id)
    expect(data?.map((r) => r.id)).toEqual([localId])
  })

  it('streams savedId in the done event', async () => {
    user = await createUser('hosted_pro')
    await uploadResume(user)
    const localId = randomUUID()
    const res = await callFunction('tailor', { token: user.token, body: { job: JOB, localId }, headers: { Accept: 'application/x-ndjson' } })
    const done = (await readNdjson(res)).at(-1)
    expect(done?.type === 'done' && done.savedId).toBe(localId)
  })

  it("without a local ID, savedId is the stored row's ID (1.2.0 sends none)", async () => {
    user = await createUser('hosted_pro')
    await uploadResume(user)
    const body = await (await callFunction('tailor', { token: user.token, body: { job: JOB } })).json()
    const { data } = await admin.from('tailored_resumes').select('id').eq('user_id', user.id)
    expect(data?.map((r) => r.id)).toEqual([body.savedId])
  })

  it('a local ID that belongs to another account saves nothing and returns no savedId', async () => {
    const other = await createUser('hosted_pro')
    try {
      await uploadResume(other)
      const localId = randomUUID()
      await callFunction('tailor', { token: other.token, body: { job: JOB, localId } })
      user = await createUser('hosted_pro')
      await uploadResume(user)
      const body = await (await callFunction('tailor', { token: user.token, body: { job: JOB, localId } })).json()
      expect(body.savedId).toBeUndefined()
      const { data } = await admin.from('tailored_resumes').select('user_id').eq('id', localId).single()
      expect(data?.user_id).toBe(other.id)
    } finally {
      await deleteUser(other)
    }
  })

  it('free accounts get no savedId', async () => {
    user = await createUser()
    await uploadResume(user)
    const body = await (await callFunction('tailor', { token: user.token, body: { job: JOB, localId: randomUUID() } })).json()
    expect(body.savedId).toBeUndefined()
  })
})
