import type { CoverLetter, CoverLetterEntry, TailoredHistoryEntry, TailoredResumeEntry } from '../types'

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
