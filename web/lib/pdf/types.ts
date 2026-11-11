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
  /** The project's URL as the resume writes it (github.com/…). */
  link?: string
  /** The project's tech-stack line, verbatim. */
  tech?: string
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
  /** Set when the section is a list of entries (an award, an open-source
   *  package) rather than loose lines: each prints like a project. */
  entries?: ResumeSectionEntry[]
}

export interface ResumeSectionEntry {
  name: string
  /** Role, placing or issuer ("Creator and Maintainer", "3rd Place | Hosted by AWS"). */
  subtitle?: string
  link?: string
  dates?: string
  bullets: string[]
}

// A section of the Cover Me layout. 'other' stands for the next of otherSections.
export type SectionKey = 'summary' | 'experience' | 'projects' | 'education' | 'certifications' | 'skills' | 'other'

export interface TailoredResume {
  name: string
  phone: string
  email: string
  website: string
  /** Every URL on the contact line, website first. Absent on a parse made before #129. */
  links?: string[]
  location?: string
  /** The professional title under the name ("Applied AI Engineer"), verbatim. */
  headline?: string
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
  // Holds the user's own input (#171): made with a note, or regenerated from a
  // version that held their edits, so the next Regenerate trusts its text like
  // editedAt. Unlike editedAt, the score is fresh.
  hasEdits?: boolean
  // The print order the user set in the editor (sections.ts). Missing means
  // the standard order.
  sectionOrder?: SectionKey[]
  // Tailored in the user's own Word file (#131): the SHA-256 of that file.
  // Missing means the Cover Me layout.
  sourceHash?: string
  // The user picked their design, but the file couldn't be edited safely, so
  // this one uses the Cover Me layout.
  designFellBack?: boolean
}

// The job fields the letter's PDF prints. The extension's JobData has more.
export interface PdfJob {
  title: string
  company: string
}
