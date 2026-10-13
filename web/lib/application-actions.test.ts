import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadDetail } from './application-actions'

afterEach(() => vi.unstubAllGlobals())

const detail = { id: 'a1', title: 'T', company: 'C', url: '', createdAt: '2026-10-01T00:00:00Z', interviewAt: null, coverLetters: [], tailoredResumes: [] }

describe('loadDetail', () => {
  it('fetches an application once and keeps it', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ application: detail }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await loadDetail('a1')).toEqual(detail)
    expect(await loadDetail('a1')).toEqual(detail)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/applications?detail=a1')
  })

  it("doesn't keep a failure: the next call tries again", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('{"error":"x"}', { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ application: { ...detail, id: 'a2' } }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(loadDetail('a2')).rejects.toThrow()
    expect((await loadDetail('a2')).id).toBe('a2')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
