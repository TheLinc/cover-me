import type { TailoredResume } from './pdf/types'

// A card: what the list shows. Letters and resumes as IDs and dates; a
// resume's ATS score and gaps come from plain columns, so the server decrypts
// nothing for the list.
export interface ApplicationSummary {
  id: string
  title: string
  company: string
  url: string
  createdAt: string
  interviewAt: string | null
  coverLetters: { id: string; createdAt: string }[]
  tailoredResumes: { id: string; createdAt: string; atsScore: number | null; atsGaps: string[] | null }[]
}

// One application in full, fetched when its details open or a Download is
// first clicked (application-actions.ts).
export interface ApplicationDetail {
  id: string
  title: string
  company: string
  url: string
  createdAt: string
  interviewAt: string | null
  coverLetters: { id: string; letter: string; createdAt: string }[]
  tailoredResumes: { id: string; resume: TailoredResume; createdAt: string }[]
}

export interface ApplicationsQuery {
  q?: string
  from?: string
  to?: string
  before?: string
  interview?: '1'
  limit?: number
}

export interface ApplicationsPage {
  applications: ApplicationSummary[]
  hasMore: boolean
}

// The parameters the website's /api/applications route forwards for the list.
// limit stays the function's default there; only the dashboard's own server
// call sets it.
export function queryFromParams(params: URLSearchParams): ApplicationsQuery {
  const query: ApplicationsQuery = {}
  for (const key of ['q', 'from', 'to', 'before'] as const) {
    const value = params.get(key)
    if (value) query[key] = value
  }
  if (params.get('interview') === '1') query.interview = '1'
  return query
}

// Date inputs give local YYYY-MM-DD; the function wants instants. "To" covers
// its whole day, so it becomes the start of the next one (exclusive). A date
// outside years 1-9999 (a date field takes up to 275760) is left out:
// JavaScript can't hold some of them and Postgres won't take the rest.
export function dayRange(from: string, to: string): { from?: string; to?: string } | null {
  const local = (d: string, addDays = 0) => {
    const [y, m, day] = d.split('-').map(Number)
    // setFullYear, not new Date(y, …), which reads years 0-99 as 1900-1999.
    const date = new Date(0)
    date.setFullYear(y, m - 1, day + addDays)
    date.setHours(0, 0, 0, 0)
    // Both years: east of UTC, local 1 January of year 1 is still year 0 in
    // UTC, and the instant sent is UTC.
    const ok = (year: number) => year >= 1 && year <= 9999
    return ok(date.getFullYear()) && ok(date.getUTCFullYear()) ? date : null
  }
  const start = from ? local(from) : null
  const end = to ? local(to, 1) : null
  if (start && end && start >= end) return null
  const range: { from?: string; to?: string } = {}
  if (start) range.from = start.toISOString()
  if (end) range.to = end.toISOString()
  return range
}

// Summaries for the cards. null on any failure (not Pro, paused project,
// network, a hang past 5 s): the dashboard renders without the section, the
// applications page shows a retry.
export async function fetchApplications(
  supabaseUrl: string,
  accessToken: string,
  query: ApplicationsQuery = {},
  signal?: AbortSignal,
): Promise<ApplicationsPage | null> {
  try {
    const url = new URL(`${supabaseUrl}/functions/v1/applications`)
    url.searchParams.set('summary', '1')
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
    }
    const timeout = AbortSignal.timeout(5000)
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    })
    if (!res.ok) return null
    const data = (await res.json()) as { applications?: ApplicationSummary[]; hasMore?: boolean }
    if (!Array.isArray(data.applications)) return null
    return { hasMore: data.hasMore === true, applications: data.applications }
  } catch {
    return null
  }
}

// A posting link only for web addresses: scraped URLs. Entries pasted by hand
// have none, and anything else isn't something to open.
export function postingHost(url: string): string | null {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.hostname.replace(/^www\./, '') : null
  } catch {
    return null
  }
}

export function newest<T extends { createdAt: string }>(items: T[]): T | undefined {
  return items.reduce<T | undefined>((best, item) => (!best || item.createdAt > best.createdAt ? item : best), undefined)
}

// The date picker gives a Date; the filters keep the local YYYY-MM-DD that
// dayRange takes.
export function toDay(date?: Date): string {
  if (!date) return ''
  const pad = (n: number, w = 2) => String(n).padStart(w, '0')
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function fromDay(day: string): Date | undefined {
  if (!day) return undefined
  const [y, m, d] = day.split('-').map(Number)
  const date = new Date(0)
  date.setFullYear(y, m - 1, d)
  date.setHours(0, 0, 0, 0)
  return Number.isNaN(date.getTime()) ? undefined : date
}
