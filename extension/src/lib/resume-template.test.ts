import { afterEach, describe, expect, test, vi } from 'vitest'
import { RESUME_TEMPLATES } from './pdf/resume'
import type { TailoredResume } from './pdf/types'
import { applySavedLook, isCachedPro, templatesUnlocked } from './resume-template'
import { isLocked, lowContrast, nextTemplate } from '../popup/components/TemplatePicker'

afterEach(() => vi.unstubAllGlobals())

function fakeLocal(data: Record<string, unknown>) {
  vi.stubGlobal('chrome', { storage: { local: { get: async (k: string | string[]) => Object.fromEntries([k].flat().filter((key) => key in data).map((key) => [key, data[key]])) } } })
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
    ['own key', { settings: { mode: 'byok', apiKey: 'x' } }, ['classic', 'modern', 'compact', 'minimal']],
    ['own key with a free tier left in the cache', { settings: { mode: 'byok', apiKey: 'x' }, cachedTier: 'hosted_free' }, ['classic', 'modern', 'compact', 'minimal']],
    ['a new install that never checked its tier', {}, ['classic']],
  ])('%s', async (_, storage, expected) => {
    fakeLocal(storage)
    const unlocked = await templatesUnlocked()
    expect(RESUME_TEMPLATES.filter((t) => !isLocked(t, unlocked))).toEqual(expected)
  })

  test('own key unlocks templates without counting as Pro, so the editor never reads the account', async () => {
    fakeLocal({ settings: { mode: 'byok', apiKey: 'x' }, cachedTier: 'hosted_pro' })
    expect(await isCachedPro()).toBe(false)
  })
})

describe('an own-key tailored resume (#119)', () => {
  const resume = () => ({ name: 'Pat Doe', experience: [], education: [] }) as unknown as TailoredResume

  test('comes out in the saved template and accent', async () => {
    fakeLocal({ resumeTemplate: 'modern', resumeAccent: '#0F766E' })
    const r = resume()
    await applySavedLook(r)
    expect(r).toMatchObject({ template: 'modern', accent: '#0F766E' })
  })

  test('stays on the default look when nothing was saved', async () => {
    fakeLocal({})
    const r = resume()
    await applySavedLook(r)
    expect(r.template).toBeUndefined()
    expect(r.accent).toBeUndefined()
  })
})

describe('the warning under the accent picker (#119)', () => {
  test('a pale accent is flagged as hard to read on white, a strong one is not', () => {
    expect(lowContrast('#FFEB3B')).toBe(true)
    expect(lowContrast('#A5B4FC')).toBe(true)
    expect(lowContrast('#3B82F6')).toBe(true)
    expect(lowContrast('#4F46E5')).toBe(false)
    expect(lowContrast('#0F766E')).toBe(false)
  })
})
