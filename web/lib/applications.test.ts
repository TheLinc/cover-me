import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchApplications, summarizeApplication, type Application } from './applications'

afterEach(() => vi.unstubAllGlobals())

const app = (resumes: Application['tailoredResumes']): Application => ({
  id: 'a1', title: 'Engineer', company: 'Northwind', url: '', createdAt: '2026-10-01T00:00:00Z',
  coverLetters: [{ id: 'l1', letter: 'Dear…', createdAt: '2026-10-01T00:00:00Z' }],
  tailoredResumes: resumes,
})

describe('fetchApplications', () => {
  it('returns the applications for a Pro account', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ applications: [app([])] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await fetchApplications('https://x.supabase.co', 'at')).toHaveLength(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://x.supabase.co/functions/v1/applications')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer at')
  })

  // The dashboard is a client component, so whatever this returns is sent to
  // the browser. Only the score and gaps are shown; the rest is personal data.
  it('keeps only the ATS score and gaps of each tailored resume', async () => {
    const full = { name: 'Pat', email: 'pat@example.com', phone: '555', experience: [{ title: 'x' }], atsScore: 80, atsGaps: ['Go'] }
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ applications: [app([{ id: 't1', resume: full, createdAt: '2026-10-01T00:00:00Z' }])] }), { status: 200 })))
    const [a] = (await fetchApplications('https://x.supabase.co', 'at'))!
    expect(a.tailoredResumes[0].resume).toEqual({ atsScore: 80, atsGaps: ['Go'] })
  })

  it('is null when the call fails, so the dashboard still renders', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"Pro only"}', { status: 403 })))
    expect(await fetchApplications('https://x.supabase.co', 'at')).toBeNull()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>502</html>', { status: 502 })))
    expect(await fetchApplications('https://x.supabase.co', 'at')).toBeNull()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed') }))
    expect(await fetchApplications('https://x.supabase.co', 'at')).toBeNull()
  })
})

describe('summarizeApplication', () => {
  it('counts artifacts and takes the best ATS score with its gaps', () => {
    const s = summarizeApplication(app([
      { id: 't1', resume: { atsScore: 72, atsGaps: ['GraphQL'] }, createdAt: '2026-10-01T00:00:00Z' },
      { id: 't2', resume: { atsScore: 86, atsGaps: ['Kubernetes'] }, createdAt: '2026-10-02T00:00:00Z' },
    ]))
    expect(s).toEqual({ letters: 1, resumes: 2, bestScore: 86, gaps: ['Kubernetes'] })
  })

  it('handles resumes saved before ATS scoring', () => {
    expect(summarizeApplication(app([{ id: 't1', resume: {}, createdAt: '2026-10-01T00:00:00Z' }])))
      .toEqual({ letters: 1, resumes: 1, bestScore: null, gaps: [] })
  })
})
