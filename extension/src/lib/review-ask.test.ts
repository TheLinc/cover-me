import { afterEach, describe, expect, test, vi } from 'vitest'
import { countShowingWhenSeen, generationsSoFar, shouldAskForReview } from './review-ask'
import { addToHistory, addToTailoredHistory, getGenerationCount } from './storage'

const now = Date.parse('2026-11-02T12:00:00Z')
const gen = (count: number, firstAt = '2026-11-01T11:00:00Z') => ({ count, firstAt })

describe('shouldAskForReview', () => {
  test('never before 3 generations or before the first is a day old', () => {
    expect(shouldAskForReview(null, null, now)).toBe(false)
    expect(shouldAskForReview(gen(2), null, now)).toBe(false)
    expect(shouldAskForReview(gen(5, '2026-11-02T00:00:00Z'), null, now)).toBe(false)
  })

  test('asks at 3 generations once the first is 24 hours old', () => {
    expect(shouldAskForReview(gen(3, '2026-11-01T12:00:00Z'), null, now)).toBe(true)
  })

  test('after the first showing, asks again only 10 generations later', () => {
    const ask = { shown: 1, atCount: 4, done: false }
    expect(shouldAskForReview(gen(13), ask, now)).toBe(false)
    expect(shouldAskForReview(gen(14), ask, now)).toBe(true)
  })

  test('never a third time, or after a link click', () => {
    expect(shouldAskForReview(gen(100), { shown: 2, atCount: 14, done: false }, now)).toBe(false)
    expect(shouldAskForReview(gen(100), { shown: 1, atCount: 4, done: true }, now)).toBe(false)
  })
})

describe('generationsSoFar', () => {
  const entry = (createdAt: string, account?: string) => ({ createdAt, account })

  test('counts history made before the generation count existed', () => {
    const entries = [entry('2026-10-20T00:00:00Z'), entry('2026-10-21T00:00:00Z'), entry('2026-11-08T00:00:00Z')]
    expect(generationsSoFar(gen(1, '2026-11-08T00:00:00Z'), entries)).toEqual({ count: 3, firstAt: '2026-10-20T00:00:00Z' })
    expect(generationsSoFar(null, entries)).toEqual({ count: 3, firstAt: '2026-10-20T00:00:00Z' })
  })

  test('keeps the stored count when history is shorter, and the earlier first date', () => {
    expect(generationsSoFar(gen(12, '2026-11-01T00:00:00Z'), [entry('2026-11-05T00:00:00Z')])).toEqual({ count: 12, firstAt: '2026-11-01T00:00:00Z' })
  })

  test("skips a previous user's entries", () => {
    const entries = [entry('2026-10-01T00:00:00Z', 'other'), entry('2026-10-02T00:00:00Z', 'other'), entry('2026-11-08T00:00:00Z', 'u1')]
    expect(generationsSoFar(null, entries)).toEqual({ count: 1, firstAt: '2026-11-08T00:00:00Z' })
    expect(generationsSoFar(null, [entry('2026-10-01T00:00:00Z', 'other')])).toBeNull()
  })

  test('a user with 3 day-old entries qualifies whatever the stored count says', () => {
    const entries = [entry('2026-10-20T00:00:00Z'), entry('2026-10-21T00:00:00Z'), entry('2026-10-22T00:00:00Z')]
    expect(shouldAskForReview(generationsSoFar(null, entries), null, now)).toBe(true)
    expect(shouldAskForReview(generationsSoFar(gen(1, '2026-11-02T11:00:00Z'), entries), null, now)).toBe(true)
  })
})

describe('countShowingWhenSeen', () => {
  afterEach(() => vi.useRealTimers())

  test('saves the showing once the card has been on screen for 2 seconds', () => {
    vi.useFakeTimers()
    const save = vi.fn()
    countShowingWhenSeen(save)
    vi.advanceTimersByTime(1999)
    expect(save).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(save).toHaveBeenCalledTimes(1)
  })

  test('a card gone sooner, like a popup closed straight after a copy, saves nothing', () => {
    vi.useFakeTimers()
    const save = vi.fn()
    countShowingWhenSeen(save).cancel()
    vi.advanceTimersByTime(10_000)
    expect(save).not.toHaveBeenCalled()
  })

  test('Not now or Send feedback saves it straight away, and only once', () => {
    vi.useFakeTimers()
    const save = vi.fn()
    const showing = countShowingWhenSeen(save)
    showing.now()
    showing.now()
    vi.advanceTimersByTime(10_000)
    showing.cancel()
    expect(save).toHaveBeenCalledTimes(1)
  })
})

describe('generation count', () => {
  afterEach(() => vi.unstubAllGlobals())

  test('letters and tailored resumes both count, and firstAt is set once', async () => {
    const data: Record<string, unknown> = {}
    vi.stubGlobal('chrome', { storage: { local: {
      get: async (k: string) => (k in data ? { [k]: data[k] } : {}),
      set: async (o: Record<string, unknown>) => { Object.assign(data, o) },
    } } })
    const job = { title: 'Engineer', company: 'Northwind', url: '', description: '' }
    await addToHistory({ id: 'l1', job, letter: 'x', createdAt: '2026-11-01T00:00:00Z' })
    const first = (await getGenerationCount())!.firstAt
    await addToTailoredHistory({ id: 't1', job, resume: { name: '', phone: '', email: '', website: '', experience: [], education: [] }, createdAt: '2026-11-02T00:00:00Z' })
    expect(await getGenerationCount()).toEqual({ count: 2, firstAt: first })
  })
})
