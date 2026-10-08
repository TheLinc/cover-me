import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  callFunction, createUser, deleteUser, JOB, mockClaude, quotaUsedToday, setQuotaUsedToday, type TestUser, uploadResume,
} from './helpers'

describe('generate', () => {
  let user: TestUser | undefined

  beforeEach(() => mockClaude.reset())
  afterEach(async () => {
    await deleteUser(user)
    user = undefined
  })

  it('returns a letter and charges one generation', async () => {
    user = await createUser()
    await uploadResume(user)

    const res = await callFunction('generate', { token: user.token, body: { job: JOB } })
    expect(res.status).toBe(200)
    const { letter } = await res.json()
    expect(letter).toContain('Dear Acme Team')
    expect(await quotaUsedToday(user.id)).toBe(1)

    const [first] = await mockClaude.requests()
    expect(first.model).toMatch(/sonnet/)
    expect(first.messages[0].content).toContain('Built billing export pipeline')
    expect(first.messages[0].content).toContain(JOB.description)
  })

  it('asks Sonnet 5.5 for the letter with adaptive thinking at high effort and server-side fallback', async () => {
    user = await createUser()
    await uploadResume(user)
    await callFunction('generate', { token: user.token, body: { job: JOB } })

    const [first] = await mockClaude.requests()
    expect(first.model).toBe('claude-sonnet-5-5')
    // With thinking off, letters cited posting requirements the resume lacks in
    // 26 of 32 eval cases; at high effort, 0 of 32. Thinking counts toward
    // max_tokens, so the limit must leave room for it.
    expect(first.thinking).toEqual({ type: 'adaptive' })
    expect(first.output_config).toEqual({ effort: 'high' })
    expect(first.max_tokens).toBeGreaterThanOrEqual(8000)
    expect(first.fallbacks).toBe('default')
    expect(first.betaHeader).toBe('server-side-fallback-2026-07-01')
  })

  // Chrome stops an extension service worker whose fetch() gets no response for
  // 30 s. Headers must arrive before Claude answers, not after.
  it('sends headers before the letter is ready', async () => {
    user = await createUser()
    await uploadResume(user)
    await mockClaude.delayNext(6000)

    const started = Date.now()
    const res = await callFunction('generate', { token: user.token, body: { job: JOB } })
    expect(Date.now() - started).toBeLessThan(4000)
    expect(res.status).toBe(200)
    const { letter } = await res.json()
    expect(Date.now() - started).toBeGreaterThanOrEqual(6000)
    expect(letter).toContain('Dear Acme Team')
  }, 20_000)

  // Headers have already gone out as 200, so a late failure is an { error } body.
  it('refunds the generation when Claude declines the request', async () => {
    user = await createUser()
    await uploadResume(user)
    await mockClaude.refuseNext()
    const res = await callFunction('generate', { token: user.token, body: { job: JOB } })
    expect((await res.json()).error).toMatch(/Empty response/)
    expect(await quotaUsedToday(user.id)).toBe(0)
  })

  it('refunds the generation when the user has no resume', async () => {
    user = await createUser()
    const res = await callFunction('generate', { token: user.token, body: { job: JOB } })
    expect(res.status).toBe(400)
    expect(await quotaUsedToday(user.id)).toBe(0)
  })

  it('refunds the generation when the job description is missing', async () => {
    user = await createUser()
    await uploadResume(user)
    const res = await callFunction('generate', { token: user.token, body: { job: { title: 'Engineer' } } })
    expect(res.status).toBe(400)
    expect(await quotaUsedToday(user.id)).toBe(0)
  })

  it('refunds the generation when Claude fails', async () => {
    user = await createUser()
    await uploadResume(user)
    await mockClaude.failNext(529)
    const res = await callFunction('generate', { token: user.token, body: { job: JOB } })
    expect((await res.json()).error).toMatch(/generation failed/)
    expect(await quotaUsedToday(user.id)).toBe(0)
  })

  it('returns 429 at the free daily limit without calling Claude', async () => {
    user = await createUser()
    await uploadResume(user)
    await setQuotaUsedToday(user.id, 5)

    const res = await callFunction('generate', { token: user.token, body: { job: JOB } })
    expect(res.status).toBe(429)
    expect((await res.json()).error).toMatch(/free generations/)
    expect(await mockClaude.requests()).toHaveLength(0)
    expect(await quotaUsedToday(user.id)).toBe(5)
  })

  it('lets Pro users past the free limit without counting usage', async () => {
    user = await createUser('hosted_pro')
    await uploadResume(user)
    await setQuotaUsedToday(user.id, 5)

    const res = await callFunction('generate', { token: user.token, body: { job: JOB } })
    expect(res.status).toBe(200)
    expect(await quotaUsedToday(user.id)).toBe(5)
  })
})
