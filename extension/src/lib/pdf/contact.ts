// Shared with the website. Edit here, then run `node scripts/sync-pdf.mjs`,
// which copies this folder to web/lib/pdf/ (both builds fail on a stale copy).
import type { TailoredResume } from './types'

// The resume header's contact line, in the order the PDF, the Word file and
// the dashboard preview print it. A resume parsed before #129 has no links or
// location, only website. Stored resumes are untrusted JSON, so each field is
// checked to be a string.
export function contactParts(resume: TailoredResume): string[] {
  const links = Array.isArray(resume.links) && resume.links.length ? resume.links : [resume.website]
  return [resume.location, resume.phone, resume.email, ...links]
    .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
}
