// Query parameters for the applications function's GET. With none, the
// result is the newest 30, as before the dashboard search existed (the live
// extension sends none).
export interface ApplicationSearch {
  terms: string[]
  from: string | null
  to: string | null
  before: string | null
  limit: number
  stages: Stage[]    // only applications in these stages; empty is all
  summary: boolean   // what a card shows, nothing decrypted (the website's list)
}

// Where an application stands (migration 020's CHECK). Closed covers
// rejected, withdrawn and never heard back. Mirrored in web/lib/applications.ts.
export const STAGES = ['applied', 'interviewing', 'offer', 'closed'] as const
export type Stage = typeof STAGES[number]
export const isStage = (value: unknown): value is Stage => STAGES.includes(value as Stage)

const MAX_Q = 100
const MAX_TERMS = 5
const DEFAULT_LIMIT = 30
const MAX_LIMIT = 50

// undefined = present but not a date. toISOString() keeps only milliseconds,
// so the microseconds of a created_at (Postgres keeps six digits) are put
// back: a paging cursor rounded to the millisecond would skip rows from the
// same millisecond.
function instant(value: string | null): string | null | undefined {
  if (value === null || value === '') return null
  const t = Date.parse(value)
  if (Number.isNaN(t)) return undefined
  const micros = /:\d{2}\.\d{3}(\d{1,3})/.exec(value)?.[1] ?? ''
  return new Date(t).toISOString().replace('Z', `${micros}Z`)
}

export function parseSearch(params: URLSearchParams): ApplicationSearch | { error: string } {
  // PostgREST reads * as a wildcard in LIKE patterns, so it's dropped.
  const terms = (params.get('q') ?? '').slice(0, MAX_Q).replace(/\*/g, '').split(/\s+/).filter(Boolean).slice(0, MAX_TERMS)

  const from = instant(params.get('from'))
  const to = instant(params.get('to'))
  const before = instant(params.get('before'))
  if (from === undefined || to === undefined || before === undefined) return { error: 'Invalid date' }

  let limit = DEFAULT_LIMIT
  const rawLimit = params.get('limit')
  if (rawLimit !== null) {
    const n = Number(rawLimit)
    if (!Number.isInteger(n) || n < 1 || n > MAX_LIMIT) return { error: 'Invalid limit' }
    limit = n
  }

  // stage=interviewing,offer
  const stages = (params.get('stage') ?? '').split(',').filter(Boolean)
  if (!stages.every(isStage)) return { error: 'Invalid stage' }

  return { terms, from, to, before, limit, stages, summary: params.get('summary') === '1' }
}

// Escape LIKE's own wildcards so a term matches literally.
export function likeContains(term: string): string {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
}
