import { afterEach, describe, expect, test, vi } from 'vitest'
import { getHistory, getTailoredHistory, getUploadAsked, markUploadAsked, setEntryAccounts } from './storage'

function fakeLocal(data: Record<string, unknown> = {}) {
  vi.stubGlobal('chrome', { storage: { local: {
    get: async (k: string | string[]) => Object.fromEntries((Array.isArray(k) ? k : [k]).filter((key) => key in data).map((key) => [key, data[key]])),
    set: async (o: Record<string, unknown>) => { Object.assign(data, o) },
  } } })
  return data
}

const job = { title: 'Engineer', company: 'Northwind', url: 'https://jobs.example/1', description: 'x' }
const resume = { name: 'Pat', phone: '', email: '', website: '', experience: [], education: [] }

afterEach(() => vi.unstubAllGlobals())

describe('which account holds each local entry', () => {
  test('setEntryAccounts marks only the IDs given', async () => {
    fakeLocal({
      history: [{ id: 'l1', job, letter: 'x', createdAt: 'a' }, { id: 'l2', job, letter: 'x', createdAt: 'b' }],
      tailoredHistory: [{ id: 't1', job, resume, createdAt: 'a' }],
    })
    await setEntryAccounts({ letters: { l1: 'me' }, tailored: { t1: 'other' } })
    expect((await getHistory()).map((e) => e.account)).toEqual(['me', undefined])
    expect((await getTailoredHistory()).map((e) => e.account)).toEqual(['other'])
  })

  // A list it doesn't change isn't rewritten: the background may be adding to
  // it at the same moment.
  test('setEntryAccounts writes only the lists it changes', async () => {
    const data = fakeLocal({ history: [{ id: 'l1', job, letter: 'x', createdAt: 'a' }], tailoredHistory: [] })
    const set = vi.spyOn(chrome.storage.local, 'set')
    await setEntryAccounts({ letters: { l1: 'me' } })
    expect(set.mock.calls.map((c) => Object.keys(c[0]))).toEqual([['history']])
    await setEntryAccounts({ letters: { nope: 'me' }, tailored: {} })
    expect(set).toHaveBeenCalledTimes(1)
    expect((data.history as { account?: string }[])[0].account).toBe('me')
  })

  test('remembers which accounts answered the upload prompt', async () => {
    fakeLocal()
    expect(await getUploadAsked()).toEqual([])
    await markUploadAsked('me')
    await markUploadAsked('me')
    expect(await getUploadAsked()).toEqual(['me'])
  })
})
