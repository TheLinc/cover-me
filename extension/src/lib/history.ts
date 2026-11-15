import type { ApplicationRecord, CoverLetter, CoverLetterEntry, JobData, TailoredHistoryEntry, TailoredResumeEntry } from '../types'
import { HISTORY_LIMIT, TAILORED_HISTORY_LIMIT } from './storage'
import type { UploadResult } from './auth'

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
  localOnly?: boolean // Pro list: an entry that exists only in this browser
}

// One posting: its URL, or company and title when there's no URL.
export const jobKey = (job: Pick<JobData, 'url' | 'company' | 'title'>) => job.url || `${job.company}|||${job.title}`

// Local letters and tailored resumes, grouped by posting (jobKey), newest
// activity first.
export function groupLocalHistory(letters: CoverLetter[], tailored: TailoredHistoryEntry[]): JobGroup[] {
  const map = new Map<string, JobGroup>()
  const groupFor = (job: CoverLetter['job'], createdAt: string): JobGroup => {
    const key = jobKey(job)
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

// The jobs a right-click answer can be written for when the page has no
// posting (#232): one per posting, newest first. Leaves out jobs saved with
// no posting text, which can't be answered from, and entries that belong to
// another account than userId (signed out: any account's).
export function recentJobs(letters: CoverLetter[], tailored: TailoredHistoryEntry[], userId?: string, limit = 10): JobData[] {
  const seen = new Set<string>()
  const mine = (owner?: string) => !owner || owner === userId
  return [...letters, ...tailored]
    .filter((e) => mine(e.account) && mine(e.saveTo) && e.job.description?.trim())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((e) => e.job)
    .filter((job) => {
      const key = jobKey(job)
      return !seen.has(key) && !!seen.add(key)
    })
    .slice(0, limit)
}

// The jobs offered for a right-click answer (#232), the one to write for
// first. The page's job leads when it read one, except that a saved job for
// the same posting takes its place: Lever and Ashby put the form on its own
// page (/apply, /application), which the scrapers can read as a "posting" of
// form text, and the saved copy has the real one. jobSource: whether the
// first job is this page's.
export function answerJobs(page: JobData | null, saved: JobData[]): { jobs: JobData[]; jobSource: 'page' | 'saved' } {
  if (!page) return { jobs: saved, jobSource: 'saved' }
  // An application page (/apply, /application) is its posting's page by path;
  // any other page needs the same link, query included (LinkedIn and Indeed
  // tell jobs apart by the query alone).
  const path = (url: string) => url.replace(/[?#].*$/, '').replace(/\/$/, '')
  const formOf = /\/(apply|application)$/.exec(path(page.url))
  const posting = formOf ? path(page.url).slice(0, -formOf[0].length) : null
  const known = (company: string) => !!company && company !== 'Unknown Company'
  const same = (j: JobData) =>
    (!!j.url && (j.url === page.url || (posting !== null && path(j.url) === posting))) ||
    (known(page.company) && j.title.toLowerCase() === page.title.toLowerCase() && j.company.toLowerCase() === page.company.toLowerCase())
  const match = saved.find(same)
  return { jobs: [match ?? page, ...saved.filter((j) => j !== match && jobKey(j) !== jobKey(page))], jobSource: 'page' }
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

// What a server answer (applications POST) means for each submitted entry.
// Check: confirmed IDs only. Save: confirmed IDs are this account's, failed
// ones are left for another try, and the rest already belong to another
// account (never-overwrite means nothing else leaves an ID unsaved).
export function accountUpdates(
  submitted: { letters: string[]; tailored: string[] },
  result: UploadResult,
  userId: string,
  check: boolean,
): { letters: Record<string, string>; tailored: Record<string, string> } {
  const failed = new Set(result.failed)
  const map = (ids: string[], confirmed: string[]) => {
    const mine = new Set(confirmed)
    const out: Record<string, string> = {}
    for (const id of ids) {
      if (mine.has(id)) out[id] = userId
      else if (!check && !failed.has(id)) out[id] = 'other'
    }
    return out
  }
  return { letters: map(submitted.letters, result.letters), tailored: map(submitted.tailored, result.tailored) }
}

// Not in any account yet, and not made while another account was Pro (that
// one's save failed; it's still theirs). Only these are offered, uploaded on
// Save, or shown as local-only.
export const unclaimed = (userId: string) => (e: { account?: string; saveTo?: string }): boolean =>
  !e.account && (!e.saveTo || e.saveTo === userId)

// Pro History: the account's applications plus this account's unclaimed local
// entries, tagged, in date order. Entries another account holds are left out.
export function withLocalOnly(server: JobGroup[], letters: CoverLetter[], tailored: TailoredHistoryEntry[], userId: string): JobGroup[] {
  const mine = unclaimed(userId)
  const local = groupLocalHistory(letters.filter(mine), tailored.filter(mine))
    .map((g) => ({ ...g, key: `local:${g.key}`, localOnly: true }))
  return [...server, ...local].sort((a, b) => b.latestAt.localeCompare(a.latestAt))
}

// A save's result in applications (jobs), the unit the list and dashboard
// use. A job with any failed entry counts as failed; otherwise saved if any
// entry is now in the account; otherwise it belongs to another account.
export function uploadSummary(letters: CoverLetter[], tailored: TailoredHistoryEntry[], result: UploadResult): { saved: number; other: number; failed: number } {
  const mine = new Set([...result.letters, ...result.tailored])
  const failed = new Set(result.failed)
  const summary = { saved: 0, other: 0, failed: 0 }
  for (const g of groupLocalHistory(letters, tailored)) {
    const ids = [...(g.localCoverLetterIds ?? []), ...(g.localTailoredIds ?? [])]
    if (ids.some((id) => failed.has(id))) summary.failed++
    else if (ids.some((id) => mine.has(id))) summary.saved++
    else summary.other++
  }
  return summary
}

export function uploadMessage(s: { saved: number; other: number; failed: number }): string {
  const apps = (n: number) => `${n} application${n === 1 ? '' : 's'}`
  const sentences = [s.failed > 0 ? `Saved ${apps(s.saved)}.` : `Saved ${apps(s.saved)} to your account.`]
  if (s.other > 0) {
    sentences.push(s.other === 1
      ? '1 was already saved to another account that used this browser, so it stays with it.'
      : `${s.other} were already saved to another account that used this browser, so they stay with it.`)
  }
  if (s.failed > 0) sentences.push(`${s.failed} couldn't be saved, try again.`)
  return sentences.join(' ')
}

// The account's applications as History groups. Dated like local groups, by
// the newest thing made for the job, so a card keeps its date once saved.
export function groupsFromApplications(apps: ApplicationRecord[]): JobGroup[] {
  return apps.map((app) => ({
    key: app.id,
    id: app.id,
    title: app.title,
    company: app.company,
    url: app.url,
    latestAt: [...app.coverLetters, ...app.tailoredResumes].reduce((latest, e) => (e.createdAt > latest ? e.createdAt : latest), app.createdAt),
    coverLetters: app.coverLetters,
    tailoredResumes: app.tailoredResumes,
  })).sort((a, b) => b.latestAt.localeCompare(a.latestAt))
}

// Unsaved entries made while this account was Pro (see CoverLetter.saveTo).
export function ownPending(letters: CoverLetter[], tailored: TailoredHistoryEntry[], userId: string): { letters: CoverLetter[]; tailored: TailoredHistoryEntry[] } {
  const mine = <T extends { account?: string; saveTo?: string }>(e: T) => !e.account && e.saveTo === userId
  return { letters: letters.filter(mine), tailored: tailored.filter(mine) }
}
