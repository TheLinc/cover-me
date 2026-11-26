import { afterEach, describe, expect, test, vi } from 'vitest'
import { RESUME_TEMPLATES } from './pdf/resume'
import { isCachedPro } from './resume-template'
import { isLocked, lowContrast, nextTemplate } from '../popup/components/TemplatePicker'

afterEach(() => vi.unstubAllGlobals())

function fakeLocal(data: Record<string, unknown>) {
  vi.stubGlobal('chrome', { storage: { local: { get: async (k: string) => (k in data ? { [k]: data[k] } : {}) } } })
}

describe('the template Settings shows for the next resume (#119)', () => {
  test('a Pro pick saved before Pro lapsed shows as Classic, which the next resume gets', () => {
    expect(nextTemplate('modern', false)).toBe('classic')
  })

  test('Pro sees the saved pick, and a fresh install sees Classic', () => {
    expect(nextTemplate('modern', true)).toBe('modern')
    expect(nextTemplate(undefined, true)).toBe('classic')
  })
})

describe('which templates an account can pick (#119)', () => {
  test.each([
    ['a Pro account', { settings: { mode: 'hosted' }, cachedTier: 'hosted_pro' }, ['classic', 'modern', 'compact', 'minimal']],
    ['a free account', { settings: { mode: 'hosted' }, cachedTier: 'hosted_free' }, ['classic']],
    ['own key, even with a Pro tier left in the cache', { settings: { mode: 'byok', apiKey: 'x' }, cachedTier: 'hosted_pro' }, ['classic']],
    ['a new install that never checked its tier', {}, ['classic']],
  ])('%s', async (_, storage, expected) => {
    fakeLocal(storage)
    const pro = await isCachedPro()
    expect(RESUME_TEMPLATES.filter((t) => !isLocked(t, pro))).toEqual(expected)
  })
})

describe('the warning under the accent picker (#119)', () => {
  test('a pale accent is flagged as hard to read on white, a strong one is not', () => {
    expect(lowContrast('#FFEB3B')).toBe(true)
    expect(lowContrast('#A5B4FC')).toBe(true)
    expect(lowContrast('#4F46E5')).toBe(false)
    expect(lowContrast('#0F766E')).toBe(false)
  })
})
