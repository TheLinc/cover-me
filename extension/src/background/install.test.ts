import { afterEach, describe, expect, test, vi } from 'vitest'
import { WEB_URL } from '../lib/config'
import { getWhatsNew } from '../lib/storage'
import { handleInstalled, uninstallUrl, WELCOME_PATH } from './install'

function fakeChrome(resume?: unknown, version = '1.4.0') {
  const data: Record<string, unknown> = { resume }
  const chrome = {
    runtime: { getURL: (p: string) => `chrome-extension://id/${p}`, getManifest: () => ({ version }) },
    tabs: { create: vi.fn(async () => ({})) },
    storage: {
      local: {
        remove: vi.fn(async () => {}),
        get: vi.fn(async (key: string) => ({ [key]: data[key] })),
        set: vi.fn(async (items: Record<string, unknown>) => { Object.assign(data, items) }),
      },
    },
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
  const news = async () => (await chrome.storage.local.get('designNews')).designNews
  test('an update with a resume saved before Word designs shows it', async () => {
    fakeChrome(pdf)
    await handleInstalled({ reason: 'update', previousVersion: '1.4.0' })
    expect(await news()).toBe('pending')
  })
  test('a new install, an update with no resume, or one already using a design never does', async () => {
    for (const [reason, saved] of [['install', pdf], ['update', undefined], ['update', { ...pdf, design: { hash: 'h' } }]] as const) {
      fakeChrome(saved)
      await handleInstalled({ reason, previousVersion: '1.4.0' })
      expect(await news(), `${reason} ${JSON.stringify(saved)}`).toBe('seen')
    }
  })
  test('it is decided once, so a later update never brings it back', async () => {
    fakeChrome(pdf)
    await chrome.storage.local.set({ designNews: 'seen' })
    await handleInstalled({ reason: 'update', previousVersion: '1.5.0' })
    expect(await news()).toBe('seen')
  })
})

describe("the popup's What's new link", () => {
  test('a fresh install counts its version as seen', async () => {
    fakeChrome(undefined, '1.5.0')
    await handleInstalled({ reason: 'install' })
    expect(await getWhatsNew()).toBeNull()
  })
  test('an update to a new minor or major version shows it, pointing at that version', async () => {
    fakeChrome(undefined, '1.5.0')
    await handleInstalled({ reason: 'update', previousVersion: '1.4.2' })
    expect(await getWhatsNew()).toBe('1.5.0')
    fakeChrome(undefined, '2.0.0')
    await handleInstalled({ reason: 'update', previousVersion: '1.5.3' })
    expect(await getWhatsNew()).toBe('2.0.0')
  })
  test("a patch update or a Chrome update doesn't", async () => {
    fakeChrome(undefined, '1.5.1')
    await handleInstalled({ reason: 'update', previousVersion: '1.5.0' })
    await handleInstalled({ reason: 'chrome_update', previousVersion: '1.4.0' })
    expect(await getWhatsNew()).toBeNull()
  })
  test('a patch update keeps a link not yet clicked', async () => {
    const chrome = fakeChrome(undefined, '1.5.0')
    await handleInstalled({ reason: 'update', previousVersion: '1.4.0' })
    chrome.runtime.getManifest = () => ({ version: '1.5.1' })
    await handleInstalled({ reason: 'update', previousVersion: '1.5.0' })
    expect(await getWhatsNew()).toBe('1.5.0')
  })
})

// Builds up to 1.7.0 skipped the Word file when the cached plan was stale (#181).
describe('the Word file a stale plan skipped', () => {
  const session = { access_token: 'token', refresh_token: 'r', expires_at: 9999999999, user: { id: 'user-1' } }
  const withDesign = { text: 'Ada', filename: 'ada.docx', updatedAt: 'd', accountId: 'user-1', design: { hash: 'h', status: 'done', size: 10 } }
  async function update(serverTier: string) {
    fakeChrome(withDesign)
    await chrome.storage.local.set({ session, cachedTier: 'hosted_free', 'designFile:h': { data: 'AAAA' } })
    const fetch = vi.fn(async (url: string) => new Response(url.includes('/rest/v1/users') ? JSON.stringify([{ tier: serverTier }]) : '{}'))
    vi.stubGlobal('fetch', fetch)
    await handleInstalled({ reason: 'update', previousVersion: '1.7.0' })
    return fetch.mock.calls.filter(([url]) => url.includes('/functions/v1/resume?file=1')).length
  }
  test('an update sends it when the server says Pro, though the cache says Free', async () => {
    expect(await update('hosted_pro')).toBe(1)
    expect((await chrome.storage.local.get('resume')).resume).toMatchObject({ design: { uploaded: true } })
  })
  test('it stays in the browser when the plan is Free', async () => {
    expect(await update('hosted_free')).toBe(0)
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
