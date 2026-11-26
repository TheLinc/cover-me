import { afterEach, describe, expect, test, vi } from 'vitest'
import { RESUME_TEMPLATES } from './pdf/resume'
import { isCachedPro } from './resume-template'
import { isLocked } from '../popup/components/TemplatePicker'

afterEach(() => vi.unstubAllGlobals())

function fakeLocal(data: Record<string, unknown>) {
  vi.stubGlobal('chrome', { storage: { local: { get: async (k: string) => (k in data ? { [k]: data[k] } : {}) } } })
}

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
