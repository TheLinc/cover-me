'use client'

import type { ApplicationDetail, ApplicationSummary, Stage, StageState } from './applications'
import type { PdfJob, TailoredResume } from './pdf/types'

// The cards' calls to /api/applications. Signed out (401), or a Pro account
// that lapsed mid-visit asking for a document (403), leaves the page; the promise never settles, so nothing flashes an
// error on the way out.
async function call(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(path, init)
  // Signed out: back to this dashboard page after signing in (safeNext keeps it to dashboard paths).
  const leaveTo = res.status === 401 ? `/auth?next=${encodeURIComponent(window.location.pathname)}` : res.status === 403 ? '/dashboard' : null
  if (leaveTo) {
    window.location.assign(leaveTo)
    return new Promise(() => {})
  }
  return res
}

// The message of the error thrown when the application is gone (404): deleted
// from another device or tab since the list loaded.
export const GONE = 'gone'
export const GONE_MESSAGE = 'This application was already deleted.'

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
    if (!res.ok) throw new Error(res.status === 404 ? GONE : String(res.status))
    // An older function ignores detail= and answers with the whole list.
    const { application } = (await res.json()) as { application?: ApplicationDetail }
    if (!application) throw new Error('No application in the response')
    return application
  })
  details.set(app.id, { key, promise })
  promise.catch(() => { if (details.get(app.id)?.promise === promise) details.delete(app.id) })
  return promise
}

export async function setStage(id: string, stage: Stage): Promise<StageState> {
  const res = await call(`/api/applications?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage }),
  })
  if (!res.ok) throw new Error(res.status === 404 ? GONE : String(res.status))
  return (await res.json()) as StageState
}

export async function deleteApplication(id: string): Promise<void> {
  const res = await call(`/api/applications?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
  // 404: already deleted (another device or tab), so the card can go too.
  if (!res.ok && res.status !== 404) throw new Error(String(res.status))
  details.delete(id)
}

// jsPDF and docx load only when someone downloads.
export async function downloadLetter(job: PdfJob, letter: { letter: string; createdAt: string }): Promise<void> {
  const { downloadCoverLetterPdf } = await import('./pdf/cover-letter')
  downloadCoverLetterPdf(letter.letter, { title: job.title, company: job.company }, letter.createdAt)
}

// format 'design': the Word file the resume was tailored in, with the tailored
// text in place (#131); the Cover Me layout's Word file if that can't be done.
export async function downloadResume(jobTitle: string, resume: TailoredResume, format: 'pdf' | 'docx' | 'design' = 'pdf'): Promise<void> {
  if (format === 'design' && resume.sourceHash) {
    const res = await call(`/api/applications?file=${encodeURIComponent(resume.sourceHash)}`)
    if (res.ok) {
      const { docx, structured } = (await res.json()) as { docx: string; structured: TailoredResume }
      const { downloadDesignDocx } = await import('./pdf/docx-design')
      if (await downloadDesignDocx(Uint8Array.from(atob(docx), (c) => c.charCodeAt(0)), structured, resume, jobTitle)) return
    }
  }
  if (format !== 'pdf') {
    const { downloadTailoredResumeDocx } = await import('./pdf/resume-docx')
    return downloadTailoredResumeDocx(resume, jobTitle)
  }
  const { downloadTailoredResumePdf } = await import('./pdf/resume')
  downloadTailoredResumePdf(resume, jobTitle)
}
