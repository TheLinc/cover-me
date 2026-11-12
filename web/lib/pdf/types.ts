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
  // Sections deleted in the editor (#197), with the text they had, so they
  // can be restored. Nothing prints them.
  deletedSections?: DeletedSection[]
  // Tailored in the user's own Word file (#131): the SHA-256 of that file.
  // Missing means the Cover Me layout.
  sourceHash?: string
  // The user picked their design, but the file couldn't be edited safely, so
  // this one uses the Cover Me layout.
  designFellBack?: boolean
}

// A deleted section: its content under its own field (an extra section under
// section), and where it sat in the editor's list.
export type DeletedSection = { index: number } & (
  | { key: 'other'; section: ResumeSection }
  | ({ key: Exclude<SectionKey, 'other'> } & Partial<Pick<TailoredResume, 'summary' | 'experience' | 'projects' | 'education' | 'certifications' | 'skills'>>)
)

// The job fields the letter's PDF prints. The extension's JobData has more.
export interface PdfJob {
  title: string
  company: string
}
