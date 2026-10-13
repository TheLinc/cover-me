'use client'

import type { ApplicationDetail, ApplicationSummary } from './applications'
import type { PdfJob, TailoredResume } from './pdf/types'

// The cards' calls to /api/applications. Signed out (401) or no longer Pro
// (403) leaves the page; the promise never settles, so nothing flashes an
// error on the way out.
async function call(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(path, init)
  const leaveTo = res.status === 401 ? '/auth' : res.status === 403 ? '/dashboard' : null
  if (leaveTo) {
    window.location.assign(leaveTo)
    return new Promise(() => {})
  }
  return res
}

// Each application's detail is fetched once and kept for the visit: the
// drawer and both Download buttons share it. It's kept against the letter and
// resume IDs the card's summary lists, so a newer summary (the extension added
// a letter since) fetches again. A failure isn't kept.
const details = new Map<string, { key: string; promise: Promise<ApplicationDetail> }>()

const contentKey = (app: ApplicationSummary) =>
  [...app.coverLetters.map((l) => l.id), '|', ...app.tailoredResumes.map((r) => r.id)].join(',')

export function loadDetail(app: ApplicationSummary): Promise<ApplicationDetail> {
  const key = contentKey(app)
  const cached = details.get(app.id)
  if (cached && cached.key === key) return cached.promise
  const promise = call(`/api/applications?detail=${encodeURIComponent(app.id)}`).then(async (res) => {
    if (!res.ok) throw new Error(String(res.status))
    // An older function ignores detail= and answers with the whole list.
    const { application } = (await res.json()) as { application?: ApplicationDetail }
    if (!application) throw new Error('No application in the response')
    return application
  })
  details.set(app.id, { key, promise })
  promise.catch(() => { if (details.get(app.id)?.promise === promise) details.delete(app.id) })
  return promise
}

export async function setInterview(id: string, interview: boolean): Promise<string | null> {
  const res = await call(`/api/applications?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ interview }),
  })
  if (!res.ok) throw new Error(String(res.status))
  return ((await res.json()) as { interviewAt: string | null }).interviewAt
}

export async function deleteApplication(id: string): Promise<void> {
  const res = await call(`/api/applications?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
  // 404: already deleted (another device or tab), so the card can go too.
  if (!res.ok && res.status !== 404) throw new Error(String(res.status))
  details.delete(id)
}

// jsPDF loads only when someone downloads.
export async function downloadLetter(job: PdfJob, letter: { letter: string; createdAt: string }): Promise<void> {
  const { downloadCoverLetterPdf } = await import('./pdf/cover-letter')
  downloadCoverLetterPdf(letter.letter, { title: job.title, company: job.company }, letter.createdAt)
}

export async function downloadResume(jobTitle: string, resume: TailoredResume): Promise<void> {
  const { downloadTailoredResumePdf } = await import('./pdf/resume')
  downloadTailoredResumePdf(resume, jobTitle)
}
