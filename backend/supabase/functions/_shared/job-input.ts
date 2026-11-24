import { isObject, MAX_JOB_FIELD } from './history-upload.ts'

export const MAX_BODY_BYTES = 1_000_000
export const MAX_SUPPLEMENTAL = 10_000
// The prompts read no further than this, so grounding and scoring don't either (#0000).
const MAX_DESCRIPTION = 15_000

export interface JobInput { title: string; company: string; description: string; url?: string }

export const text = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '')

export function readJob(v: unknown): JobInput | null {
  if (!isObject(v)) return null
  const { title, description, company, url } = v
  if (typeof title !== 'string' || typeof description !== 'string' || !title || !description) return null
  return {
    title: title.slice(0, MAX_JOB_FIELD),
    company: text(company, MAX_JOB_FIELD),
    description: description.slice(0, MAX_DESCRIPTION),
    url: text(url, MAX_JOB_FIELD) || undefined,
  }
}
