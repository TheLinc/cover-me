// Pro history from the applications Edge Function (the same data the
// extension's History shows). Server-side only: called with the user's token.
export interface Application {
  id: string
  title: string
  company: string
  url: string
  createdAt: string
  coverLetters: { id: string; letter: string; createdAt: string }[]
  tailoredResumes: { id: string; resume: { atsScore?: number; atsGaps?: string[] }; createdAt: string }[]
}

export interface ApplicationsQuery {
  q?: string
  from?: string
  to?: string
  before?: string
  limit?: number
}

export interface ApplicationsPage {
  applications: Application[]
  hasMore: boolean
}

// The parameters the website's /api/applications route forwards. limit stays
// the function's default there; only the dashboard's own server call sets it.
export function queryFromParams(params: URLSearchParams): ApplicationsQuery {
  const query: ApplicationsQuery = {}
  for (const key of ['q', 'from', 'to', 'before'] as const) {
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
    const year = date.getFullYear()
    return year >= 1 && year <= 9999 ? date : null
  }
  const start = from ? local(from) : null
  const end = to ? local(to, 1) : null
  if (start && end && start >= end) return null
  const range: { from?: string; to?: string } = {}
  if (start) range.from = start.toISOString()
  if (end) range.to = end.toISOString()
  return range
}

// null on any failure (not Pro, paused project, network, a hang past 5 s): the
// dashboard renders without the section, the applications page shows a retry.
export async function fetchApplications(
  supabaseUrl: string,
  accessToken: string,
  query: ApplicationsQuery = {},
  signal?: AbortSignal,
): Promise<ApplicationsPage | null> {
  try {
    const url = new URL(`${supabaseUrl}/functions/v1/applications`)
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
    const data = (await res.json()) as { applications?: Application[]; hasMore?: boolean }
    if (!Array.isArray(data.applications)) return null
    // Keep only what the pages show: the full resumes are personal data they
    // never need, and these are passed to client components.
    return {
      hasMore: data.hasMore === true,
      applications: data.applications.map((a) => ({
        ...a,
        tailoredResumes: (a.tailoredResumes ?? []).map((t) => ({
          id: t.id,
          createdAt: t.createdAt,
          resume: { atsScore: t.resume?.atsScore, atsGaps: t.resume?.atsGaps },
        })),
      })),
    }
  } catch {
    return null
  }
}

export function summarizeApplication(app: Application): { letters: number; resumes: number; bestScore: number | null; gaps: string[] } {
  let best: Application['tailoredResumes'][number] | null = null
  for (const tr of app.tailoredResumes) {
    if (typeof tr.resume.atsScore === 'number' && (best === null || tr.resume.atsScore > (best.resume.atsScore ?? -1))) best = tr
  }
  return {
    letters: app.coverLetters.length,
    resumes: app.tailoredResumes.length,
    bestScore: best?.resume.atsScore ?? null,
    gaps: best?.resume.atsGaps ?? [],
  }
}
