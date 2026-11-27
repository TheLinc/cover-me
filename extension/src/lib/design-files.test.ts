import { afterEach, describe, expect, test, vi } from 'vitest'
import { addToHistory, addToTailoredHistory, deleteFromHistory, deleteFromTailoredHistory, getDesignFile, saveDesignFile, saveResume } from './storage'

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

  test('a file stays while a letter made from it is in History, and goes with the letter (#401)', async () => {
    fakeLocal()
    await saveDesignFile('p', { data: 'cGRm' })
    await saveResume({ text: 'Pat', filename: 'pat.pdf', updatedAt: '2026-11-01T00:00:00Z', file: { id: 'p', size: 3, type: 'pdf' } })
    await addToHistory({ id: 'l', job, letter: 'Dear team', createdAt: '2026-11-02T00:00:00Z', source: { filename: 'pat.pdf', uploadedAt: '2026-11-01T00:00:00Z', fileId: 'p' } })
    await saveResume({ text: 'Pat 2', filename: 'pat2.txt', updatedAt: '2026-11-03T00:00:00Z' })
    expect(await getDesignFile('p')).toEqual({ data: 'cGRm' })
    await deleteFromHistory('l')
    expect(await getDesignFile('p')).toBeNull()
  })

  test("a file stays while a tailored resume's source points to it (#401)", async () => {
    fakeLocal()
    await saveDesignFile('p', { data: 'cGRm' })
    await addToTailoredHistory({ id: 't', job, resume: { ...resume(), source: { filename: 'pat.pdf', uploadedAt: 'x', fileId: 'p' } }, createdAt: '2026-11-02T00:00:00Z' })
    await saveResume({ text: 'Pat 2', filename: 'pat2.txt', updatedAt: '2026-11-03T00:00:00Z' })
    expect(await getDesignFile('p')).toEqual({ data: 'cGRm' })
    await deleteFromTailoredHistory('t')
    expect(await getDesignFile('p')).toBeNull()
  })

  test('a PDF file stays while the resume points to it and goes when replaced (#401)', async () => {
    fakeLocal()
    await saveDesignFile('p', { data: 'cGRm' })
    await saveResume({ text: 'Pat', filename: 'pat.pdf', updatedAt: '2026-11-01T00:00:00Z', file: { id: 'p', size: 3, type: 'pdf' } })
    expect(await getDesignFile('p')).toEqual({ data: 'cGRm' })
    await saveResume({ text: 'Pat', filename: 'pat.txt', updatedAt: '2026-11-03T00:00:00Z' })
    expect(await getDesignFile('p')).toBeNull()
  })
})
