import { afterEach, describe, expect, test, vi } from 'vitest'
import { checkForUpdate, updateCard } from './update'

describe('updateCard', () => {
  test('hidden with no pending version', () => {
    expect(updateCard({})).toBeNull()
  })
  test('shown for a pending version, button on when nothing runs', () => {
    expect(updateCard({ pendingUpdate: '1.11.0', coverJob: { status: 'done' }, tailorJob: { status: 'error' } })).toEqual({ version: '1.11.0', canRestart: true })
  })
  test('button off while a letter or a tailor is generating', () => {
    expect(updateCard({ pendingUpdate: '1.11.0', coverJob: { status: 'loading' } })).toEqual({ version: '1.11.0', canRestart: false })
    expect(updateCard({ pendingUpdate: '1.11.0', tailorJob: { status: 'loading' } })).toEqual({ version: '1.11.0', canRestart: false })
  })
})

function fakeChrome(stored: Record<string, unknown>, result: { status: string; version?: string }) {
  const data = { ...stored }
  const chrome = {
    runtime: { requestUpdateCheck: vi.fn(async () => result) },
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: data[key] })),
        set: vi.fn(async (items: Record<string, unknown>) => { Object.assign(data, items) }),
      },
    },
  }
  vi.stubGlobal('chrome', chrome)
  return { chrome, data }
}

afterEach(() => vi.unstubAllGlobals())

const HOUR = 60 * 60 * 1000
const NOW = 1_800_000_000_000

describe('checkForUpdate', () => {
  test('update_available saves the new version as pending', async () => {
    const { data } = fakeChrome({}, { status: 'update_available', version: '1.11.0' })
    await checkForUpdate(NOW)
    expect(data).toEqual({ lastUpdateCheck: NOW, pendingUpdate: '1.11.0' })
  })
  test('throttled and no_update save nothing but the time', async () => {
    for (const status of ['throttled', 'no_update']) {
      const { data } = fakeChrome({}, { status, version: '' })
      await checkForUpdate(NOW)
      expect(data).toEqual({ lastUpdateCheck: NOW })
    }
  })
  test('no check within an hour of the last one', async () => {
    const { chrome } = fakeChrome({ lastUpdateCheck: NOW - HOUR + 1 }, { status: 'update_available', version: '1.11.0' })
    await checkForUpdate(NOW)
    expect(chrome.runtime.requestUpdateCheck).not.toHaveBeenCalled()
  })
  test('checks again once the hour is up', async () => {
    const { chrome } = fakeChrome({ lastUpdateCheck: NOW - HOUR }, { status: 'no_update', version: '' })
    await checkForUpdate(NOW)
    expect(chrome.runtime.requestUpdateCheck).toHaveBeenCalledOnce()
  })
})
