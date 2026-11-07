import { afterEach, describe, expect, it, vi } from 'vitest'
import { deleteApplication, downloadResume, GONE, loadDetail } from './application-actions'

const docxMocks = vi.hoisted(() => ({ design: vi.fn(async () => true), coverMe: vi.fn(async () => {}) }))
vi.mock('./pdf/docx-design', () => ({ downloadDesignDocx: docxMocks.design }))
vi.mock('./pdf/resume-docx', () => ({ downloadTailoredResumeDocx: docxMocks.coverMe }))

afterEach(() => vi.unstubAllGlobals())

const detail = { id: 'a1', title: 'T', company: 'C', url: '', createdAt: '2026-10-01T00:00:00Z', stage: 'applied' as const, stageChangedAt: null, coverLetters: [], tailoredResumes: [] }
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
  it('reports a deleted application as gone', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"Not found"}', { status: 404 })))
    await expect(loadDetail(summary('a5'))).rejects.toThrow(GONE)
  })

  it('rejects an answer without an application, and keeps nothing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ applications: [] }), { status: 200 })))
    await expect(loadDetail(summary('a4'))).rejects.toThrow()
    await Promise.resolve()
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ application: { ...detail, id: 'a4' } }), { status: 200 })))
    expect((await loadDetail(summary('a4'))).id).toBe('a4')
  })

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

describe("downloadResume in the user's design (#131)", () => {
  const hash = 'd'.repeat(64)
  const resume = { name: 'Ada', email: '', phone: '', website: '', experience: [], education: [], sourceHash: hash }
  afterEach(() => { docxMocks.design.mockClear(); docxMocks.coverMe.mockClear() })

  it('fetches the Word file and places the tailored text in it', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ docx: btoa('file'), structured: resume }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await downloadResume('Engineer', resume, 'design')
    expect((fetchMock.mock.calls[0] as unknown[])[0]).toBe(`/api/applications?file=${hash}`)
    expect(docxMocks.design).toHaveBeenCalledWith(new TextEncoder().encode('file'), resume, resume, 'Engineer')
    expect(docxMocks.coverMe).not.toHaveBeenCalled()
  })

  it('gives the Cover Me Word file when the account has no file for it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"Not found"}', { status: 404 })))
    await downloadResume('Engineer', resume, 'design')
    expect(docxMocks.coverMe).toHaveBeenCalledWith(resume, 'Engineer')
  })
})
