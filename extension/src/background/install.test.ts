import { afterEach, describe, expect, test, vi } from 'vitest'
import { handleInstalled, isBefore, WELCOME_PATH } from './install'

function fakeChrome() {
  const chrome = {
    runtime: { getURL: (p: string) => `chrome-extension://id/${p}` },
    tabs: { create: vi.fn(async () => ({})) },
    storage: { local: { remove: vi.fn(async () => {}), set: vi.fn(async () => {}) } },
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
    await handleInstalled({ reason: 'update', previousVersion: '1.2.0' })
    await handleInstalled({ reason: 'chrome_update' })
    expect(chrome.tabs.create).not.toHaveBeenCalled()
  })
  test('every install or update still wipes the old saved password', async () => {
    const chrome = fakeChrome()
    await handleInstalled({ reason: 'update', previousVersion: '1.3.0' })
    expect(chrome.storage.local.remove).toHaveBeenCalledWith('savedLogin')
  })
  test('a first install, or an update from before 1.3.0, gets the notice about how job pages are read', async () => {
    const chrome = fakeChrome()
    await handleInstalled({ reason: 'install' })
    await handleInstalled({ reason: 'update', previousVersion: '1.2.0' })
    expect(chrome.storage.local.set).toHaveBeenCalledTimes(2)
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ pageReadNotice: true })
  })
  test('an update from 1.3.0 or later, or a Chrome update, does not', async () => {
    const chrome = fakeChrome()
    await handleInstalled({ reason: 'update', previousVersion: '1.3.0' })
    await handleInstalled({ reason: 'update', previousVersion: '1.4.2' })
    await handleInstalled({ reason: 'chrome_update' })
    expect(chrome.storage.local.set).not.toHaveBeenCalled()
  })
})

describe('isBefore', () => {
  test('compares versions part by part, as numbers', () => {
    expect(isBefore('1.2.0', '1.3.0')).toBe(true)
    expect(isBefore('1.2.9', '1.3.0')).toBe(true)
    expect(isBefore('1.10.0', '1.3.0')).toBe(false)
    expect(isBefore('1.3.0', '1.3.0')).toBe(false)
    expect(isBefore('1.3.1', '1.3.0')).toBe(false)
    expect(isBefore('2.0', '1.3.0')).toBe(false)
  })

  test('a missing or unreadable version counts as older, so the notice shows', () => {
    expect(isBefore(undefined, '1.3.0')).toBe(true)
    expect(isBefore('beta', '1.3.0')).toBe(true)
  })
})
