import type { TailoredResume } from './pdf/types'

// Where an application stands, in order (migration 020's CHECK). Closed
// covers rejected, withdrawn and never heard back. Mirrored from
// backend/supabase/functions/_shared/application-search.ts.
export const STAGES = ['applied', 'interviewing', 'offer', 'closed'] as const
export type Stage = typeof STAGES[number]
export const STAGE_LABEL: Record<Stage, string> = { applied: 'Applied', interviewing: 'Interviewing', offer: 'Offer', closed: 'Closed' }

// Shown on a free account's cards, where a Pro one offers its documents.
export const PRO_LINE = 'Your letters and resumes on any device with Pro'

export interface StageState {
  stage: Stage
  stageChangedAt: string | null // null until the user first changes it
}

// A card: what the list shows. Letters and resumes as IDs and dates; a
// resume's ATS score and gaps come from plain columns, so the server decrypts
// nothing for the list.
export interface ApplicationSummary extends StageState {
  id: string
  title: string
  company: string
  url: string
  createdAt: string
  coverLetters: { id: string; createdAt: string }[]
  // editedAt: when the user last edited it in the extension's editor (#118),
  // so the score is from before those edits. Null until then.
  tailoredResumes: { id: string; createdAt: string; atsScore: number | null; atsGaps: string[] | null; editedAt?: string | null }[]
}

// One application in full, fetched when its details open or a Download is
// first clicked (application-actions.ts).
export interface ApplicationDetail extends StageState {
  id: string
  title: string
  company: string
  url: string
  createdAt: string
  coverLetters: { id: string; letter: string; createdAt: string }[]
  tailoredResumes: { id: string; resume: TailoredResume; createdAt: string }[]
}

export interface ApplicationsQuery {
  q?: string
  from?: string
  to?: string
  limit?: number
}

export interface ApplicationsPage {
  applications: ApplicationSummary[]
  hasMore: boolean
}

// The applications page loads every match at once, up to this many (the
// function's cap for summaries), and sorts and filters by stage itself.
// ponytail: one load of the newest 200. If anyone reaches it, page per stage
// on the server instead.
export const PAGE_LIMIT = 200

// What the website's /api/applications route asks the function for: the
// page's search and dates, and the newest PAGE_LIMIT.
export function queryFromParams(params: URLSearchParams): ApplicationsQuery {
  const query: ApplicationsQuery = { limit: PAGE_LIMIT }
  for (const key of ['q', 'from', 'to'] as const) {
    const value = params.get(key)
    if (value) query[key] = value
  }
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

// Summaries for the cards. null on any failure (paused project,
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

// The applications page's one sort menu, for the board and the list.
export const SORTS = ['moved', 'newest', 'oldest', 'company'] as const
export type Sort = typeof SORTS[number]
export const SORT_LABEL: Record<Sort, string> = { moved: 'Recently moved', newest: 'Newest applied', oldest: 'Oldest applied', company: 'Company A to Z' }

const byCompany = new Intl.Collator(undefined, { sensitivity: 'base' })

// A sorted copy. Recently moved counts a card never moved from when it was
// applied; Company A to Z puts cards with no company last, ties newest first.
export function sortApplications(list: ApplicationSummary[], sort: Sort): ApplicationSummary[] {
  // As instants: the server's +00:00 and the browser's Z don't compare as text.
  const desc = (a: string, b: string) => Date.parse(b) - Date.parse(a)
  const compare: Record<Sort, (a: ApplicationSummary, b: ApplicationSummary) => number> = {
    moved: (a, b) => desc(a.stageChangedAt ?? a.createdAt, b.stageChangedAt ?? b.createdAt),
    newest: (a, b) => desc(a.createdAt, b.createdAt),
    oldest: (a, b) => desc(b.createdAt, a.createdAt),
    company: (a, b) => (!a.company !== !b.company ? (a.company ? -1 : 1) : byCompany.compare(a.company, b.company) || desc(a.createdAt, b.createdAt)),
  }
  return [...list].sort(compare[sort])
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
