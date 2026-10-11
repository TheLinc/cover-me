import { afterEach, describe, expect, test, vi } from 'vitest'
import { addToTailoredHistory, deleteFromTailoredHistory, getTailoredHistory } from './storage'

function fakeLocal(data: Record<string, unknown> = {}) {
  vi.stubGlobal('chrome', { storage: { local: {
    get: async (k: string) => (k in data ? { [k]: data[k] } : {}),
    set: async (o: Record<string, unknown>) => { Object.assign(data, o) },
  } } })
  return data
}

const job = { title: 'Engineer', company: 'Northwind', url: 'https://jobs.example/1', description: 'x' }
const resume = { name: 'Pat', phone: '', email: '', website: '', experience: [], education: [] }
const entry = (id: string, createdAt: string) => ({ id, job, resume, createdAt })

afterEach(() => vi.unstubAllGlobals())

describe('tailored resume history', () => {
  test('starts empty and keeps the newest first', async () => {
    fakeLocal()
    expect(await getTailoredHistory()).toEqual([])
    await addToTailoredHistory(entry('a', '2026-10-01T00:00:00Z'))
    await addToTailoredHistory(entry('b', '2026-10-02T00:00:00Z'))
    expect((await getTailoredHistory()).map((e) => e.id)).toEqual(['b', 'a'])
  })

  test('keeps at most 20, dropping the oldest', async () => {
    fakeLocal()
    for (let i = 0; i < 22; i++) await addToTailoredHistory(entry(`r${i}`, `2026-10-01T00:00:${String(i).padStart(2, '0')}Z`))
    const ids = (await getTailoredHistory()).map((e) => e.id)
    expect(ids).toHaveLength(20)
    expect(ids[0]).toBe('r21')
    expect(ids).not.toContain('r0')
    expect(ids).not.toContain('r1')
  })

  test('deletes one entry by id', async () => {
    fakeLocal({ tailoredHistory: [entry('a', '2026-10-01T00:00:00Z'), entry('b', '2026-10-02T00:00:00Z')] })
    await deleteFromTailoredHistory('a')
    expect((await getTailoredHistory()).map((e) => e.id)).toEqual(['b'])
  })
})
