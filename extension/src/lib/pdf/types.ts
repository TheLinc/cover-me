// Shared with the website. Edit here, then run `node scripts/sync-pdf.mjs`,
// which copies this folder to web/lib/pdf/ (both builds fail on a stale copy).

export interface ResumeExperience {
  title: string
  company: string
  location: string
  dates: string
  bullets: string[]
}

export interface ResumeProject {
  name: string
  bullets: string[]
}

export interface ResumeEducation {
  institution: string
  degree: string
  location: string
  dates: string
  bullets: string[]
}

// Any section besides summary, experience, projects, education, skills and
// certifications (publications, volunteer work, awards). Copied verbatim by
// the parser and never rewritten by the tailor.
export interface ResumeSection {
  heading: string
  lines: string[]
}

export interface TailoredResume {
  name: string
  phone: string
  email: string
  website: string
  summary?: string
  experience: ResumeExperience[]
  projects?: ResumeProject[]
  education: ResumeEducation[]
  skills?: string
  certifications?: string[]
  otherSections?: ResumeSection[]
  atsScore?: number
  atsGaps?: string[]
  // Set when the user edits it in the extension's editor tab (#118). The ATS
  // score is from before the edit, and says so. atsGapsBeforeEdits keeps the
  // gaps that score found; atsGaps drops the ones the edits filled.
  editedAt?: string
  atsGapsBeforeEdits?: string[]
}

// The job fields the letter's PDF prints. The extension's JobData has more.
export interface PdfJob {
  title: string
  company: string
}
