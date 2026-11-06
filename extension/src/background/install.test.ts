import { afterEach, describe, expect, test, vi } from 'vitest'
import { WEB_URL } from '../lib/config'
import { handleInstalled, uninstallUrl, WELCOME_PATH } from './install'

function fakeChrome(resume?: unknown) {
  const chrome = {
    runtime: { getURL: (p: string) => `chrome-extension://id/${p}` },
    tabs: { create: vi.fn(async () => ({})) },
    storage: { local: { remove: vi.fn(async () => {}), get: vi.fn(async () => ({ resume })), set: vi.fn(async () => {}) } },
  }
  vi.stubGlobal('chrome', chrome)
  return chrome
}

afterEach(() => vi.unstubAllGlobals())

describe('handleInstalled', () => {
  test('a first install opens the welcome tab', async () => {
    const chrome = fakeChrome()
    await handleInstalled({ reason: 'install' })
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: `chrome-extension://id/${WELCOME_PATH}` })
  })
  test('an update or Chrome update never opens it', async () => {
    const chrome = fakeChrome()
    await handleInstalled({ reason: 'update' })
    await handleInstalled({ reason: 'chrome_update' })
    expect(chrome.tabs.create).not.toHaveBeenCalled()
  })
  test('every install or update still wipes the old saved password', async () => {
    const chrome = fakeChrome()
    await handleInstalled({ reason: 'update' })
    expect(chrome.storage.local.remove).toHaveBeenCalledWith('savedLogin')
  })
  const resume = (chars: number) => ({ text: 'x'.repeat(chars), filename: 'r.pdf', updatedAt: 'd', parsed: { name: 'A' } })
  test('an update from before 1.3.0 drops the parse of a resume over 6,000 characters', async () => {
    const chrome = fakeChrome(resume(6001))
    await handleInstalled({ reason: 'update', previousVersion: '1.2.0' })
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ resume: { text: 'x'.repeat(6001), filename: 'r.pdf', updatedAt: 'd' } })
  })
  test('a shorter resume, a later update or a Chrome update keeps the parse', async () => {
    const short = fakeChrome(resume(6000))
    await handleInstalled({ reason: 'update', previousVersion: '1.2.0' })
    expect(short.storage.local.set).not.toHaveBeenCalledWith(expect.objectContaining({ resume: expect.anything() }))
    const long = fakeChrome(resume(9000))
    await handleInstalled({ reason: 'update', previousVersion: '1.3.0' })
    await handleInstalled({ reason: 'update', previousVersion: '1.10.0' })
    await handleInstalled({ reason: 'chrome_update', previousVersion: '1.2.0' })
    expect(long.storage.local.set).not.toHaveBeenCalledWith(expect.objectContaining({ resume: expect.anything() }))
  })
})

// The dot on the Resume tab that tells existing users about Word files (#131).
describe('the Word design news', () => {
  const pdf = { text: 'Ada', filename: 'ada.pdf', updatedAt: 'd' }
  test('an update with a resume saved before Word designs shows it', async () => {
    const chrome = fakeChrome(pdf)
    await handleInstalled({ reason: 'update', previousVersion: '1.4.0' })
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ designNews: 'pending' })
  })
  test('a new install, an update with no resume, or one already using a design never does', async () => {
    for (const [reason, saved] of [['install', pdf], ['update', undefined], ['update', { ...pdf, design: { hash: 'h' } }]] as const) {
      const chrome = fakeChrome(saved)
      await handleInstalled({ reason, previousVersion: '1.4.0' })
      expect(chrome.storage.local.set, `${reason} ${JSON.stringify(saved)}`).toHaveBeenCalledWith({ designNews: 'seen' })
    }
  })
  test('it is decided once, so a later update never brings it back', async () => {
    const chrome = fakeChrome(pdf)
    chrome.storage.local.get.mockImplementation(async () => ({ resume: pdf, designNews: 'seen' }))
    await handleInstalled({ reason: 'update', previousVersion: '1.5.0' })
    expect(chrome.storage.local.set).not.toHaveBeenCalledWith({ designNews: 'pending' })
  })
})

describe('uninstallUrl', () => {
  test('signed out, it carries only the version', () => {
    expect(uninstallUrl('1.4.0')).toBe(`${WEB_URL}/uninstalled?v=1.4.0`)
  })
  test("signed in, it adds the account id and stays under Chrome's 1,023 characters", () => {
    const url = uninstallUrl('1.4.0', '3f2b8c1e-9d4a-4e6b-8f1a-2c7d5e9b0a13')
    expect(url).toBe(`${WEB_URL}/uninstalled?v=1.4.0&u=3f2b8c1e-9d4a-4e6b-8f1a-2c7d5e9b0a13`)
    expect(url.length).toBeLessThan(1023)
  })
})
