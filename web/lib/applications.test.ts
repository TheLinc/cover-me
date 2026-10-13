import { afterEach, describe, expect, it, vi } from 'vitest'
import { dayRange, fetchApplications, queryFromParams, summarizeApplication, type Application } from './applications'

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
    expect((await fetchApplications('https://x.supabase.co', 'at'))?.applications).toHaveLength(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://x.supabase.co/functions/v1/applications')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer at')
  })

  // Only the score and gaps are shown; the rest is personal data the
  // dashboard never needs.
  it('keeps only the ATS score and gaps of each tailored resume', async () => {
    const full = { name: 'Pat', email: 'pat@example.com', phone: '555', experience: [{ title: 'x' }], atsScore: 80, atsGaps: ['Go'] }
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ applications: [app([{ id: 't1', resume: full, createdAt: '2026-10-01T00:00:00Z' }])] }), { status: 200 })))
    const [a] = (await fetchApplications('https://x.supabase.co', 'at'))!.applications
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

describe('fetchApplications query', () => {
  it('sends only the parameters that are set, and reads hasMore', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ applications: [], hasMore: true }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const page = await fetchApplications('https://x.supabase.co', 'at', { q: 'acme eng', from: '2026-10-01T04:00:00.000Z', to: '', limit: 5 })
    expect(page).toEqual({ applications: [], hasMore: true })
    const [url] = fetchMock.mock.calls[0] as unknown as [string]
    expect(url).toBe('https://x.supabase.co/functions/v1/applications?q=acme+eng&from=2026-10-01T04%3A00%3A00.000Z&limit=5')
  })

  it('treats a missing hasMore as false', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ applications: [] }), { status: 200 })))
    expect(await fetchApplications('https://x.supabase.co', 'at')).toEqual({ applications: [], hasMore: false })
  })
})

describe('queryFromParams', () => {
  it('keeps q, from, to and before only', () => {
    const p = new URLSearchParams('q=a&from=b&to=c&before=d&limit=50&id=x')
    expect(queryFromParams(p)).toEqual({ q: 'a', from: 'b', to: 'c', before: 'd' })
  })
})

describe('dayRange', () => {
  it('turns local dates into instants, to inclusive of its whole day', () => {
    expect(dayRange('2026-10-03', '2026-10-05')).toEqual({
      from: new Date(2026, 9, 3).toISOString(),
      to: new Date(2026, 9, 6).toISOString(),
    })
  })
  it('allows either side alone', () => {
    expect(dayRange('', '2026-10-05')).toEqual({ to: new Date(2026, 9, 6).toISOString() })
    expect(dayRange('2026-10-03', '')).toEqual({ from: new Date(2026, 9, 3).toISOString() })
    expect(dayRange('', '')).toEqual({})
  })
  // A date field accepts years JavaScript can't turn into an instant, and
  // new Date(y, …) reads 0-99 as 1900-1999.
  it('ignores a date past what JavaScript can hold, and keeps two-digit years as typed', () => {
    expect(dayRange('', '275760-09-12')).toEqual({})
    const y99 = new Date(0)
    y99.setFullYear(99, 0, 1)
    y99.setHours(0, 0, 0, 0)
    expect(dayRange('0099-01-01', '')).toEqual({ from: y99.toISOString() })
  })
  it('is null when from is after to', () => {
    expect(dayRange('2026-10-06', '2026-10-05')).toBeNull()
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
