import { afterEach, describe, expect, test, vi } from 'vitest'
import { addToTailoredHistory, deleteFromTailoredHistory, getDesignFile, saveDesignFile, saveResume } from './storage'

function fakeLocal(data: Record<string, unknown> = {}) {
  const pick = (k: string | string[]) => Object.fromEntries((Array.isArray(k) ? k : [k]).filter((x) => x in data).map((x) => [x, data[x]]))
  vi.stubGlobal('chrome', { storage: { local: {
    get: async (k: string | string[]) => pick(k),
    set: async (o: Record<string, unknown>) => { Object.assign(data, o) },
    remove: async (k: string | string[]) => { for (const x of Array.isArray(k) ? k : [k]) delete data[x] },
  } } })
  return data
}

const job = { title: 'Engineer', company: 'Northwind', url: 'https://jobs.example/1', description: 'x' }
const resume = (sourceHash?: string) => ({ name: 'Pat', phone: '', email: '', website: '', experience: [], education: [], ...(sourceHash ? { sourceHash } : {}) })
const upload = (hash: string) => ({ text: 'Pat', filename: 'pat.docx', updatedAt: '2026-11-01T00:00:00Z', design: { hash, size: 10, status: 'done' as const } })

afterEach(() => vi.unstubAllGlobals())

describe('design file store', () => {
  test('a replaced file stays while a History entry uses it, and goes with the last one', async () => {
    fakeLocal()
    await saveDesignFile('old', { data: 'b2xk' })
    await saveResume(upload('old'))
    await addToTailoredHistory({ id: 'a', job, resume: resume('old'), createdAt: '2026-11-02T00:00:00Z' })

    await saveDesignFile('new', { data: 'bmV3' })
    await saveResume(upload('new'))
    expect(await getDesignFile('old')).toEqual({ data: 'b2xk' })

    await deleteFromTailoredHistory('a')
    expect(await getDesignFile('old')).toBeNull()
    expect(await getDesignFile('new')).toEqual({ data: 'bmV3' })
  })

  test('a file nothing points to is removed when the resume is replaced', async () => {
    fakeLocal()
    await saveDesignFile('old', { data: 'b2xk' })
    await saveResume(upload('old'))
    await saveResume({ text: 'Pat', filename: 'pat.pdf', updatedAt: '2026-11-03T00:00:00Z' })
    expect(await getDesignFile('old')).toBeNull()
  })
})
