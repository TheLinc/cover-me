// The applications function's POST body: entries from the extension's local
// history, saved to the account under their local IDs. check: true only asks
// which IDs the account already holds.
// Spec: docs/superpowers/specs/2026-10-13-local-history-upload-design.md

export interface UploadJob { title?: string; company?: string; url?: string }

export type UploadEntry =
  | { kind: 'letter'; id: string; job: UploadJob; createdAt: string; letter: string }
  | { kind: 'tailored'; id: string; job: UploadJob; createdAt: string; resume: Record<string, unknown> }

export interface Upload {
  check: boolean
  letterIds: string[]
  tailoredIds: string[]
  entries: UploadEntry[] // oldest first; empty for a check
}

export const MAX_UPLOAD_BYTES = 1_000_000
const MAX_LETTERS = 50
const MAX_TAILORED = 20
const MAX_LETTER_CHARS = 20_000
const MAX_RESUME_JSON = 50_000
const MAX_JOB_FIELD = 2_048
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v)
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function parseJob(v: unknown): UploadJob | null {
  if (v === undefined || v === null) return {}
  if (!isObject(v)) return null
  const job: UploadJob = {}
  for (const key of ['title', 'company', 'url'] as const) {
    const field = v[key]
    if (field === undefined || field === null || field === '') continue
    if (typeof field !== 'string' || field.length > MAX_JOB_FIELD) return null
    job[key] = field
  }
  return job
}

// A date that doesn't parse, or is in the future (a wrong device clock),
// becomes now.
function when(v: unknown, now: number): string {
  const t = typeof v === 'string' ? Date.parse(v) : NaN
  return new Date(Number.isNaN(t) || t > now ? now : t).toISOString()
}

export function parseUpload(body: unknown, now = Date.now()): Upload | { error: string } {
  if (!isObject(body)) return { error: 'Invalid request body' }
  const letters = body.letters ?? []
  const tailored = body.tailored ?? []
  if (!Array.isArray(letters) || !Array.isArray(tailored)) return { error: 'Invalid request body' }
  if (letters.length > MAX_LETTERS || tailored.length > MAX_TAILORED) return { error: 'Too many entries' }

  const upload: Upload = { check: body.check === true, letterIds: [], tailoredIds: [], entries: [] }
  for (const e of letters) {
    if (!isObject(e) || !isUuid(e.id)) return { error: 'Invalid id' }
    upload.letterIds.push(e.id)
    if (upload.check) continue
    const job = parseJob(e.job)
    if (!job || typeof e.letter !== 'string' || !e.letter || e.letter.length > MAX_LETTER_CHARS) return { error: 'Invalid letter' }
    upload.entries.push({ kind: 'letter', id: e.id, job, createdAt: when(e.createdAt, now), letter: e.letter })
  }
  for (const e of tailored) {
    if (!isObject(e) || !isUuid(e.id)) return { error: 'Invalid id' }
    upload.tailoredIds.push(e.id)
    if (upload.check) continue
    const job = parseJob(e.job)
    if (!job || !isObject(e.resume) || JSON.stringify(e.resume).length > MAX_RESUME_JSON) return { error: 'Invalid resume' }
    upload.entries.push({ kind: 'tailored', id: e.id, job, createdAt: when(e.createdAt, now), resume: e.resume })
  }
  // Oldest first, so a new job application takes its oldest entry's date.
  upload.entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  return upload
}

// The ATS columns tailor stores, read from an uploaded resume. Anything that
// isn't a 0-100 score or a list of strings is left empty.
export function atsColumns(resume: Record<string, unknown>): { ats_score: number | null; ats_gaps: string[] | null } {
  const score = resume.atsScore
  const gaps = resume.atsGaps
  return {
    ats_score: typeof score === 'number' && score >= 0 && score <= 100 ? Math.round(score) : null,
    ats_gaps: Array.isArray(gaps) && gaps.every((g) => typeof g === 'string') ? gaps as string[] : null,
  }
}
