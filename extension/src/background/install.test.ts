import { afterEach, describe, expect, test, vi } from 'vitest'
import { handleInstalled, WELCOME_PATH } from './install'

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
    expect(short.storage.local.set).not.toHaveBeenCalled()
    const long = fakeChrome(resume(9000))
    await handleInstalled({ reason: 'update', previousVersion: '1.3.0' })
    await handleInstalled({ reason: 'update', previousVersion: '1.10.0' })
    await handleInstalled({ reason: 'chrome_update', previousVersion: '1.2.0' })
    expect(long.storage.local.set).not.toHaveBeenCalled()
  })
})
