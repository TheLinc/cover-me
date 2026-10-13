import { afterEach, describe, expect, test, vi } from 'vitest'
import { tailorViaBackend, uploadLocalHistory, UploadError } from './auth'

const job = { title: 'Engineer', company: 'Northwind', url: 'https://jobs.example/1', description: 'a long posting' }
const resume = { name: 'Pat', phone: '', email: '', website: '', experience: [], education: [] }

afterEach(() => vi.unstubAllGlobals())

function answer(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('uploadLocalHistory', () => {
  test('sends entries without job descriptions and reads the answer', async () => {
    const fetchMock = answer(200, { letters: ['l1'], tailored: [], failed: ['t1'] })
    const result = await uploadLocalHistory('at',
      [{ id: 'l1', job, letter: 'Dear team', createdAt: '2026-10-01T00:00:00Z' }],
      [{ id: 't1', job, resume, createdAt: '2026-10-02T00:00:00Z' }])
    expect(result).toEqual({ letters: ['l1'], tailored: [], failed: ['t1'] })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/\/functions\/v1\/applications$/)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({
      letters: [{ id: 'l1', job: { title: 'Engineer', company: 'Northwind', url: 'https://jobs.example/1' }, letter: 'Dear team', createdAt: '2026-10-01T00:00:00Z' }],
      tailored: [{ id: 't1', job: { title: 'Engineer', company: 'Northwind', url: 'https://jobs.example/1' }, resume, createdAt: '2026-10-02T00:00:00Z' }],
    })
  })

  test('a check sends IDs only', async () => {
    const fetchMock = answer(200, { letters: [], tailored: [], failed: [] })
    await uploadLocalHistory('at', [{ id: 'l1', job, letter: 'x', createdAt: 'a' }], [], true)
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toEqual({ check: true, letters: [{ id: 'l1' }], tailored: [] })
  })

  test('an error carries the status', async () => {
    answer(403, { error: 'Pro only' })
    const err = await uploadLocalHistory('at', [], []).catch((e) => e)
    expect(err).toBeInstanceOf(UploadError)
    expect(err.status).toBe(403)
  })
})

describe('tailorViaBackend', () => {
  test('sends the local ID and returns the saved ID', async () => {
    const fetchMock = answer(200, { resume, savedId: 'abc' })
    const out = await tailorViaBackend(job, 'at', false, undefined, false, true, undefined, undefined, 'abc')
    expect(out).toEqual({ resume, savedId: 'abc' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string).localId).toBe('abc')
  })
})
