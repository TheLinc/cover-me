// Shared with the website. Edit here, then run `node scripts/sync-pdf.mjs`,
// which copies this folder to web/lib/pdf/ (both builds fail on a stale copy).
import type { TailoredResume } from './types'

// "Ada-Lovelace-senior-engineer.pdf": the same name for the PDF and the Word file.
export function resumeFileName(resume: TailoredResume, jobTitle: string | undefined, ext: 'pdf' | 'docx'): string {
  const slug = jobTitle
    ? jobTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    : 'resume'
  return `${(resume.name || 'Resume').replace(/\s+/g, '-')}-${slug}.${ext}`
}

// Starts the browser's download of a file built in the page.
export function saveFile(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  // The click starts the download before this runs; revoking later frees the blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
