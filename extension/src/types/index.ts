export type AIProvider = 'claude' | 'openai'
export type AppMode = 'byok' | 'hosted'

export interface Settings {
  provider: AIProvider
  apiKey: string
  mode: AppMode
}

export type { JobData } from '../content/scrapers/types.ts'
import type { ResumeEducation, ResumeExperience, ResumeProject, ResumeSection, ResumeSource, SectionKey, TailoredResume } from '../lib/pdf/types'
export type { ResumeEducation, ResumeExperience, ResumeProject, ResumeSection, ResumeSource, TailoredResume } from '../lib/pdf/types'
import type { DesignCheck } from '../lib/pdf/docx-design'
export type { DesignCheck } from '../lib/pdf/docx-design'
import type { PageSnapshot } from '../content/snapshot.ts'
import type { ScraperName } from '../content/scrapers/index.ts'
import type { JobData } from '../content/scrapers/types.ts'

export interface CoverLetter {
  id: string
  job: JobData
  letter: string
  createdAt: string
  // Which account holds this entry on the server: the user's ID once the
  // server confirmed it, 'other' when the ID already belongs to another
  // account (a previous user of this browser), missing while it exists only
  // in this browser (#24).
  account?: string
  // Made while signed in to this Pro account, so it was always meant to be
  // saved there. If that save didn't go through, History retries it without
  // asking (entries from before the upgrade still wait for the user's Save) (#24).
  saveTo?: string
  source?: ResumeSource
}

export interface AuthSession {
  access_token: string
  refresh_token: string
  expires_at: number
  user: {
    id: string
    email: string
    avatar_url?: string
  }
}

export interface ParsedResume {
  name: string
  email: string
  phone: string
  website: string
  /** Every URL on the contact line, website first. Absent on a parse made before #129. */
  links?: string[]
  location?: string
  /** The professional title under the name, verbatim (#190). */
  headline?: string
  experience: ResumeExperience[]
  projects?: ResumeProject[]
  education: ResumeEducation[]
  skills?: string
  certifications?: string[]
  /** Always an array on a parse made since #54; a cached parse without it predates them and is parsed again. */
  otherSections?: ResumeSection[]
  /** The uploaded resume's section order (#165), carried to each tailored resume. Always an array on a parse made since then; a cached parse without it is parsed again. */
  sectionOrder?: SectionKey[]
  /** Set on every parse made since URLs under a section stay in their entry (#238). */
  linksKept?: true
  /** PARSE_VERSION in lib/ai/resume-parse.ts when parsed; missing on a parse from before it (#401). */
  parseVersion?: number
}

export interface ResumeData {
  text: string
  filename: string
  updatedAt: string
  parsed?: ParsedResume
  // The Cover Me account this copy belongs to. Set by a sign-in's sync, an
  // upload while signed in, a sign-out, and inherited by a signed-out upload.
  // Unset only when this browser has never had a signed-in account with a
  // resume (BYOK or a new install), so the next sign-in may claim it (#16).
  accountId?: string
  // Uploaded while signed out after an account was here. A sign-in never
  // uploads it: on a shared browser it may be someone else's (#16).
  signedOutUpload?: boolean
  // A Word upload, kept so tailoring can edit the user's own design (#131).
  // The file itself is in the design file store, under this hash.
  design?: {
    hash: string
    size: number
    status: 'checking' | 'done' | 'error'
    checkedAt?: string
    check?: DesignCheck
    error?: string
    uploaded?: boolean
    refused?: boolean // the account refused it: its resume text isn't the one checked here (#174)
  }
  // The layout picked on the resume page. Missing: "Your design" whenever its check passes (#131).
  layout?: 'yours' | 'cover-me'
  // READER_VERSION when uploaded or read again. With a stored file, an older
  // text is read again when the popup opens (lib/reread.ts) (#401).
  readerVersion?: number
  // The uploaded PDF or Word file, in the design file store under id. For
  // Word, design.hash is the same id (#401).
  file?: { id: string; size: number; type: 'pdf' | 'docx' }
  // Set by an upload only: updatedAt also moves on syncs (#401).
  uploadedAt?: string
  // A re-read saved here that the account hasn't confirmed: the SHA-256 of the
  // text it replaced. syncResume sends it as a re-read of that text (#401).
  rereadFrom?: string
}

export type GenerateResponse =
  | { success: true; letter: string; job: JobData }
  | { success: false; error: string; errorCode?: 'RATE_LIMIT' | 'FAIR_USE' }

export type TailorResponse =
  | { success: true; resume: TailoredResume; job: JobData }
  | { success: false; error: string; errorCode?: 'RATE_LIMIT' | 'FAIR_USE' }

export type ScrapeResponse =
  | { success: true; job: JobData }
  | { success: false; error: string; failure?: ScrapeFailure }

// Why a click read no job (background/scrape-failure.ts), for the popup's
// request and report screens (#130). host: without a leading www., empty for
// not_web. url and scraper: the failing page, only for a supported board.
export interface ScrapeFailure {
  reason: 'unsupported' | 'failed' | 'not_web'
  host: string
  url?: string
  scraper?: ScraperName
  error: string
}

// A frame's content script answer: its bundled scrapers' result (the offline
// fallback) plus the page for the scrape Edge Function, null when it can't be
// taken (src/content/snapshot.ts) (#3).
export type FrameScrapeResponse = ScrapeResponse & { snapshot: PageSnapshot | null }

// Service-worker-owned job records persisted to chrome.storage.local so an
// in-flight or completed generation survives the popup being closed. The popup
// derives its loading/done/error view from these; "cancel" just stops watching
// (the worker keeps running and the generation still counts) (https://github.com/TheLinc/cover-me/commit/9f4ea308d03f2c9ca2a38a38b6e1aeb9b0305051).
export interface CoverJob {
  id: string
  status: 'loading' | 'done' | 'error'
  job: JobData
  letter?: string
  createdAt?: string
  error?: string
  errorCode?: 'RATE_LIMIT' | 'FAIR_USE'
  startedAt: number
}

export interface TailorJob {
  id: string
  status: 'loading' | 'done' | 'error'
  job: JobData
  resume?: TailoredResume
  error?: string
  errorCode?: 'RATE_LIMIT' | 'FAIR_USE'
  startedAt: number
  // Live progress label derived from the model's streaming output
  // ("Rewriting experience (2 of 3)…") — shown under the popup spinner (https://github.com/TheLinc/cover-me/commit/d7700ca5cc272c75785b90971b63a366f3d35016).
  progress?: string
  // The finished resume's ID in tailored History, which the editor tab opens (#118).
  entryId?: string
  // The one-off note the run used; the popup clears its note box once done (#171).
  note?: string
}

export interface CoverLetterEntry {
  id: string
  letter: string
  createdAt: string
  source?: ResumeSource
}

export interface TailoredResumeEntry {
  id: string
  resume: TailoredResume
  createdAt: string
}

// A tailored resume kept on this device (History), for every mode (#17).
export interface TailoredHistoryEntry {
  id: string
  job: JobData
  resume: TailoredResume
  createdAt: string
  // Which account holds this entry on the server: the user's ID once the
  // server confirmed it, 'other' when the ID already belongs to another
  // account (a previous user of this browser), missing while it exists only
  // in this browser (#24).
  account?: string
  // Made while signed in to this Pro account, so it was always meant to be
  // saved there. If that save didn't go through, History retries it without
  // asking (entries from before the upgrade still wait for the user's Save) (#24).
  saveTo?: string
}

export interface ApplicationRecord {
  id: string
  title: string
  company: string
  url: string
  createdAt: string
  coverLetters: CoverLetterEntry[]
  tailoredResumes: TailoredResumeEntry[]
}
