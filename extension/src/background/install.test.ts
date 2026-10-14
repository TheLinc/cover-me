import { afterEach, describe, expect, test, vi } from 'vitest'
import { handleInstalled, WELCOME_PATH } from './install'

function fakeChrome() {
  const chrome = {
    runtime: { getURL: (p: string) => `chrome-extension://id/${p}` },
    tabs: { create: vi.fn(async () => ({})) },
    storage: { local: { remove: vi.fn(async () => {}) } },
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
})
