import { afterEach, describe, expect, it, vi } from 'vitest'
import { deleteApplication, loadDetail } from './application-actions'

afterEach(() => vi.unstubAllGlobals())

const detail = { id: 'a1', title: 'T', company: 'C', url: '', createdAt: '2026-10-01T00:00:00Z', interviewAt: null, coverLetters: [], tailoredResumes: [] }
// The card's summary of an application: loadDetail keys its cache on it.
const summary = (id: string, letters: string[] = []) => ({ ...detail, id, coverLetters: letters.map((l) => ({ id: l, createdAt: '2026-10-01T00:00:00Z' })), tailoredResumes: [] })

describe('loadDetail', () => {
  it('fetches an application once and keeps it', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ application: detail }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await loadDetail(summary('a1'))).toEqual(detail)
    expect(await loadDetail(summary('a1'))).toEqual(detail)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect((fetchMock.mock.calls[0] as unknown[])[0]).toBe('/api/applications?detail=a1')
  })

  it("doesn't keep a failure: the next call tries again", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('{"error":"x"}', { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ application: { ...detail, id: 'a2' } }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(loadDetail(summary('a2'))).rejects.toThrow()
    expect((await loadDetail(summary('a2'))).id).toBe('a2')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  // The extension can add a letter while the page is open; a new search then
  // brings a summary with more letters than the kept detail.
  it('fetches again when the summary lists different letters or resumes', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ application: { ...detail, id: 'a3' } }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await loadDetail(summary('a3', ['l1']))
    await loadDetail(summary('a3', ['l1']))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await loadDetail(summary('a3', ['l2', 'l1']))
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('deleteApplication', () => {
  // Already deleted (another device, another tab): the card can go.
  it('treats 404 as deleted, and other failures as errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"Not found"}', { status: 404 })))
    await expect(deleteApplication('a1')).resolves.toBeUndefined()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"x"}', { status: 502 })))
    await expect(deleteApplication('a1')).rejects.toThrow()
  })
})
