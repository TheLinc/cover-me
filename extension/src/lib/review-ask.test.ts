import { afterEach, describe, expect, test, vi } from 'vitest'
import { shouldAskForReview } from './review-ask'
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
