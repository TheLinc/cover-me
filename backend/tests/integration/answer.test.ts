import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  callFunction, createUser, deleteUser, JOB, mockClaude, mockPosthog, quotaUsedToday, setQuotaUsedToday, setUsage, type TestUser, uploadResume,
} from './helpers'

// Answers to application questions (#232): their own allowance, apart from
// letters and resumes (migration 032).
const QUESTION = 'Why do you want to work at Acme?'
const body = (extra: Record<string, unknown> = {}) => ({ job: JOB, question: QUESTION, jobSource: 'page', ...extra })
const answersToday = (userId: string) => quotaUsedToday(userId, 'answer_counts')

describe('answer', () => {
  let user: TestUser | undefined

  beforeEach(() => mockClaude.reset())
  afterEach(async () => {
    await deleteUser(user)
    user = undefined
  })

  it('returns an answer and counts one answer, not a letter', async () => {
    user = await createUser()
    await uploadResume(user)
    const res = await callFunction('answer', { token: user.token, body: body() })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.answer).toBeTruthy()
    expect(data.allowance).toMatchObject({ kind: 'starter', limit: 5, remaining: 4 })
    expect(await answersToday(user.id)).toBe(1)
    expect(await quotaUsedToday(user.id)).toBe(0)
  })

  it('fits the answer to the box, at a whole sentence', async () => {
    user = await createUser()
    await uploadResume(user)
    const { answer } = await (await callFunction('answer', { token: user.token, body: body({ maxLength: 200 }) })).json()
    expect(answer.length).toBeLessThanOrEqual(200)
    expect(answer).toMatch(/[.!?]$/)
    const [req] = await mockClaude.requests()
    expect(JSON.stringify(req.messages)).toContain('at most 200 characters')
  })

  // The posting, resume and instructions are the same for every question on
  // one application; caching them makes the next question cheaper (#235).
  it('asks Sonnet at high effort, with the posting and resume cached ahead of the question', async () => {
    user = await createUser()
    await uploadResume(user)
    await (await callFunction('answer', { token: user.token, body: body() })).json()
    const [req] = await mockClaude.requests()
    expect(req.model).toBe('claude-sonnet-5-5')
    expect(req.thinking).toEqual({ type: 'adaptive' })
    expect(req.output_config).toEqual({ effort: 'high' })
    const [context, question] = req.messages[0].content as unknown as Array<{ text: string; cache_control?: unknown }>
    expect(context.cache_control).toEqual({ type: 'ephemeral' })
    expect(context.text).toContain(JOB.description)
    expect(context.text).toContain('Built billing export pipeline')
    expect(context.text).not.toContain(QUESTION)
    expect(question.text).toContain(QUESTION)
  })

  it('refunds the answer when Claude fails', async () => {
    user = await createUser()
    await uploadResume(user)
    await mockClaude.failNext(529)
    const { error } = await (await callFunction('answer', { token: user.token, body: body() })).json()
    expect(error).toMatch(/Could not write an answer/)
    expect(await answersToday(user.id)).toBe(0)
  })

  it('keeps the answer counted when Claude declines', async () => {
    user = await createUser()
    await uploadResume(user)
    await mockClaude.refuseNext()
    expect((await (await callFunction('answer', { token: user.token, body: body() })).json()).error).toBeTruthy()
    expect(await answersToday(user.id)).toBe(1)
  })

  it('rejects a request with no question or job, charging nothing', async () => {
    user = await createUser()
    await uploadResume(user)
    expect((await callFunction('answer', { token: user.token, body: body({ question: '  ' }) })).status).toBe(400)
    expect((await callFunction('answer', { token: user.token, body: body({ job: { title: 'Engineer' } }) })).status).toBe(400)
    expect((await callFunction('answer', { token: user.token, body: body({ job: { title: 'Engineer', company: 'Acme', description: 42 } }) })).status).toBe(400)
    expect((await callFunction('answer', { token: user.token, body: body({ question: ['Why?'] }) })).status).toBe(400)
    expect(await answersToday(user.id)).toBe(0)
  })

  it('needs a resume', async () => {
    user = await createUser()
    expect((await callFunction('answer', { token: user.token, body: body() })).status).toBe(400)
    expect(await answersToday(user.id)).toBe(0)
  })

  it('refuses past the free weekly answers with the reset and what Pro includes, leaving letters alone', async () => {
    user = await createUser()
    await uploadResume(user)
    await setUsage(user.id, [{ daysAgo: 40, count: 5 }, { daysAgo: 0, count: 5 }], 'answer_counts')
    await setUsage(user.id, [{ daysAgo: 0, count: 3 }])
    const res = await callFunction('answer', { token: user.token, body: body() })
    expect(res.status).toBe(429)
    const { error, allowance } = await res.json()
    expect(error).toBe("You've used this week's 5 free answers. They reset Monday at 00:00 UTC, or upgrade to Pro for up to 50 a day.")
    expect(allowance).toMatchObject({ kind: 'weekly', remaining: 0 })
    expect(await mockClaude.requests()).toHaveLength(0)
    expect(await quotaUsedToday(user.id)).toBe(3)
  })

  it('a Pro account gets 50 answers a day', async () => {
    user = await createUser('hosted_pro')
    await uploadResume(user)
    await setQuotaUsedToday(user.id, 25) // letters used up: answers still work (#235)
    await setUsage(user.id, [{ daysAgo: 0, count: 49 }], 'answer_counts')
    expect((await callFunction('answer', { token: user.token, body: body() })).status).toBe(200)
    const res = await callFunction('answer', { token: user.token, body: body() })
    expect(res.status).toBe(429)
    expect((await res.json()).error).toContain("Pro's fair-use limit of 50 answers today")
  })

  it('counts each answer and each limit hit in PostHog, with only fixed values', async () => {
    user = await createUser()
    await uploadResume(user)
    await (await callFunction('answer', { token: user.token, body: body({ maxLength: 500, jobSource: 'saved' }) })).json()
    await setUsage(user.id, [{ daysAgo: 40, count: 5 }, { daysAgo: 0, count: 5 }], 'answer_counts')
    await (await callFunction('answer', { token: user.token, body: body() })).json()

    // Sent after the response (EdgeRuntime.waitUntil), so wait for both (#235).
    const mine = async () => (await mockPosthog.events()).filter((e) => e.distinct_id === user!.id)
    let events = await mine()
    for (let i = 0; i < 30 && events.length < 2; i++) events = await new Promise((r) => setTimeout(r, 100)).then(mine)
    const generated = events.find((e) => e.event === 'answer_generated')
    expect(generated?.properties).toMatchObject({ tier: 'hosted_free', hasCharLimit: true, jobSource: 'saved', revised: false })
    const hit = events.find((e) => e.event === 'answer_limit_hit')
    expect(hit?.properties).toMatchObject({ tier: 'hosted_free', kind: 'weekly' })
    expect(JSON.stringify(events)).not.toContain(QUESTION)
  })

  // The applicant asks for a change to the answer in the box (#232).
  it('rewrites the answer in the box with the change asked for, counting one more answer', async () => {
    user = await createUser()
    await uploadResume(user)
    const revision = { previous: 'I rebuilt the billing export at Initech and want to do more of that.', request: 'Make it shorter.' }
    const res = await callFunction('answer', { token: user.token, body: body({ revision }) })
    expect((await res.json()).answer).toBeTruthy()
    expect(await answersToday(user.id)).toBe(1)
    const [req] = await mockClaude.requests()
    const [context, question] = req.messages[0].content as unknown as Array<{ text: string }>
    expect(context.text).not.toContain(revision.previous)
    expect(question.text).toContain(revision.previous)
    expect(question.text).toContain(revision.request)

    const mine = async () => (await mockPosthog.events()).filter((e) => e.distinct_id === user!.id && e.event === 'answer_generated')
    let events = await mine()
    for (let i = 0; i < 30 && events.length < 1; i++) events = await new Promise((r) => setTimeout(r, 100)).then(mine)
    expect(events[0]?.properties).toMatchObject({ revised: true })
    expect(JSON.stringify(events)).not.toContain(revision.request)
  })

  it('rejects a change missing its answer or its request, charging nothing', async () => {
    user = await createUser()
    await uploadResume(user)
    for (const revision of [{ previous: 'An answer.' }, { previous: ' ', request: 'Shorter.' }, 'Shorter.']) {
      expect((await callFunction('answer', { token: user.token, body: body({ revision }) })).status).toBe(400)
    }
    expect(await answersToday(user.id)).toBe(0)
  })
})
