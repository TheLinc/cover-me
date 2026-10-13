import { afterEach, describe, expect, it, vi } from 'vitest'
import { dayRange, fetchApplications, fromDay, newest, postingHost, queryFromParams, toDay } from './applications'

afterEach(() => vi.unstubAllGlobals())

describe('fetchApplications', () => {
  it('asks for summaries, sends only the parameters that are set, and reads hasMore', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ applications: [], hasMore: true }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const page = await fetchApplications('https://x.supabase.co', 'at', { q: 'acme eng', from: '2026-10-01T04:00:00.000Z', to: '', interview: '1', limit: 5 })
    expect(page).toEqual({ applications: [], hasMore: true })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://x.supabase.co/functions/v1/applications?summary=1&q=acme+eng&from=2026-10-01T04%3A00%3A00.000Z&interview=1&limit=5')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer at')
  })

  it('treats a missing hasMore as false', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ applications: [] }), { status: 200 })))
    expect(await fetchApplications('https://x.supabase.co', 'at')).toEqual({ applications: [], hasMore: false })
  })

  it('is null when the call fails, so the dashboard still renders', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"Pro only"}', { status: 403 })))
    expect(await fetchApplications('https://x.supabase.co', 'at')).toBeNull()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed') }))
    expect(await fetchApplications('https://x.supabase.co', 'at')).toBeNull()
  })
})

describe('queryFromParams', () => {
  it('keeps q, from, to, before and interview only', () => {
    const p = new URLSearchParams('q=a&from=b&to=c&before=d&interview=1&limit=50&id=x&detail=y')
    expect(queryFromParams(p)).toEqual({ q: 'a', from: 'b', to: 'c', before: 'd', interview: '1' })
  })
})

describe('postingHost', () => {
  it('names the site of a web address, and nothing else', () => {
    expect(postingHost('https://www.jobs.example/123?ref=x')).toBe('jobs.example')
    expect(postingHost('http://careers.acme.test/a')).toBe('careers.acme.test')
    expect(postingHost('javascript:alert(1)')).toBeNull()
    expect(postingHost('')).toBeNull()
    expect(postingHost('not a url')).toBeNull()
  })
})

describe('newest', () => {
  it('picks the latest by createdAt, whatever the order', () => {
    const items = [{ id: 'a', createdAt: '2026-10-01T00:00:00Z' }, { id: 'b', createdAt: '2026-10-03T00:00:00Z' }, { id: 'c', createdAt: '2026-10-02T00:00:00Z' }]
    expect(newest(items)?.id).toBe('b')
    expect(newest([])).toBeUndefined()
  })
})

describe('toDay and fromDay', () => {
  it('turn a picked date into the local YYYY-MM-DD dayRange takes, and back', () => {
    const picked = new Date(2026, 9, 3, 15, 30)
    expect(toDay(picked)).toBe('2026-10-03')
    expect(toDay(undefined)).toBe('')
    expect(fromDay('2026-10-03')).toEqual(new Date(2026, 9, 3))
    expect(fromDay('')).toBeUndefined()
    expect(dayRange(toDay(picked), toDay(picked))).toEqual({ from: new Date(2026, 9, 3).toISOString(), to: new Date(2026, 9, 4).toISOString() })
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
  // A date field accepts years up to 275760, and new Date(y, …) reads 0-99
  // as 1900-1999.
  it('ignores five-digit years, and keeps two-digit years as typed', () => {
    expect(dayRange('', '275760-09-12')).toEqual({})
    expect(dayRange('10000-01-01', '')).toEqual({})
    expect(dayRange('', '9999-12-31')).toEqual({})
    // East of UTC, local midnight on 1 January of year 1 is still year 0 in UTC.
    expect(dayRange('0001-01-01', '')?.from?.startsWith('0000')).not.toBe(true)
    const y99 = new Date(0)
    y99.setFullYear(99, 0, 1)
    y99.setHours(0, 0, 0, 0)
    expect(dayRange('0099-01-01', '')).toEqual({ from: y99.toISOString() })
  })
  it('is null when from is after to', () => {
    expect(dayRange('2026-10-06', '2026-10-05')).toBeNull()
  })
})
