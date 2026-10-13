import type { CoverLetter, CoverLetterEntry, TailoredHistoryEntry, TailoredResumeEntry } from '../types'
import { HISTORY_LIMIT, TAILORED_HISTORY_LIMIT } from './storage'

// One job in History with everything generated for it.
export interface JobGroup {
  key: string
  id: string | null // backend job_applications id (Pro); null for local groups
  title: string
  company: string
  url: string
  latestAt: string
  coverLetters: CoverLetterEntry[]
  tailoredResumes: TailoredResumeEntry[]
  localCoverLetterIds?: string[]
  localTailoredIds?: string[]
}

// Local letters and tailored resumes, grouped by posting (URL, or company and
// title when there's no URL), newest activity first.
export function groupLocalHistory(letters: CoverLetter[], tailored: TailoredHistoryEntry[]): JobGroup[] {
  const map = new Map<string, JobGroup>()
  const groupFor = (job: CoverLetter['job'], createdAt: string): JobGroup => {
    const key = job.url || `${job.company}|||${job.title}`
    let g = map.get(key)
    if (!g) {
      g = { key, id: null, title: job.title, company: job.company, url: job.url, latestAt: createdAt, coverLetters: [], tailoredResumes: [], localCoverLetterIds: [], localTailoredIds: [] }
      map.set(key, g)
    }
    if (createdAt > g.latestAt) g.latestAt = createdAt
    return g
  }
  for (const cl of letters) {
    const g = groupFor(cl.job, cl.createdAt)
    g.coverLetters.push({ id: cl.id, letter: cl.letter, createdAt: cl.createdAt })
    g.localCoverLetterIds!.push(cl.id)
  }
  for (const tr of tailored) {
    const g = groupFor(tr.job, tr.createdAt)
    g.tailoredResumes.push({ id: tr.id, resume: tr.resume, createdAt: tr.createdAt })
    g.localTailoredIds!.push(tr.id)
  }
  for (const g of map.values()) {
    g.coverLetters.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    g.tailoredResumes.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  return Array.from(map.values()).sort((a, b) => b.latestAt.localeCompare(a.latestAt))
}

// The free account's upgrade prompt in History: once letters or tailored
// resumes come within reach of what this browser keeps, say what's about to
// be lost. null while neither is close.
export function capWarning(letters: number, tailored: number): string | null {
  const lists = [
    { count: letters, limit: HISTORY_LIMIT, noun: 'letters', near: HISTORY_LIMIT - 5 },
    { count: tailored, limit: TAILORED_HISTORY_LIMIT, noun: 'tailored resumes', near: TAILORED_HISTORY_LIMIT - 3 },
  ].filter((l) => l.count >= l.near)
  if (lists.length === 0) return null

  const full = lists.filter((l) => l.count >= l.limit)
  const near = lists.filter((l) => l.count < l.limit)
  const sentences: string[] = []
  if (full.length > 0) {
    sentences.push(`This browser keeps your last ${full.map((l) => `${l.limit} ${l.noun}`).join(' and ')}, so the oldest are now being removed.`)
  }
  if (near.length > 0) {
    sentences.push(
      `You've ${full.length > 0 ? 'also ' : ''}saved ${near.map((l) => `${l.count} of ${l.limit} ${l.noun}`).join(' and ')} in this browser.`,
      near.length === 1 ? `After ${near[0].limit}, the oldest are removed to make room.` : 'Past those limits, the oldest are removed to make room.',
    )
  }
  sentences.push('Pro saves all of them to your account, including the ones already here, and you can search them on your dashboard.')
  return sentences.join(' ')
}
