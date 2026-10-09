export type AIProvider = 'claude' | 'openai'
export type AppMode = 'byok' | 'hosted'

export interface Settings {
  provider: AIProvider
  apiKey: string // AES-GCM encrypted, stored in chrome.storage.local
  mode: AppMode  // 'byok' (default) or 'hosted'
}

export type { JobData } from '../content/scrapers/types.ts'
import type { PageSnapshot } from '../content/snapshot.ts'
import type { JobData } from '../content/scrapers/types.ts'

export interface CoverLetter {
  id: string
  job: JobData
  letter: string
  createdAt: string
}

export interface AuthSession {
  access_token: string
  refresh_token: string
  expires_at: number // unix timestamp (seconds)
  user: {
    id: string
    email: string
  }
}

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

export interface ParsedResume {
  name: string
  email: string
  phone: string
  website: string
  experience: ResumeExperience[]
  projects?: ResumeProject[]
  education: ResumeEducation[]
  skills?: string
  certifications?: string[]
}

export interface ResumeData {
  text: string
  filename: string
  updatedAt: string
  parsed?: ParsedResume
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
  atsScore?: number
  atsGaps?: string[]
}

export type GenerateResponse =
  | { success: true; letter: string; job: JobData }
  | { success: false; error: string; errorCode?: 'RATE_LIMIT' | 'FAIR_USE' }

export type TailorResponse =
  | { success: true; resume: TailoredResume; job: JobData }
  | { success: false; error: string; errorCode?: 'RATE_LIMIT' | 'FAIR_USE' }

export type ScrapeResponse =
  | { success: true; job: JobData }
  | { success: false; error: string }

// A frame's content script answer: its bundled scrapers' result (the offline
// fallback) plus the page for the scrape Edge Function, null when it can't be
// taken (src/content/snapshot.ts).
export type FrameScrapeResponse = ScrapeResponse & { snapshot: PageSnapshot | null }

// Service-worker-owned job records persisted to chrome.storage.local so an
// in-flight or completed generation survives the popup being closed. The popup
// derives its loading/done/error view from these; "cancel" just stops watching
// (the worker keeps running and the generation still counts).
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
  // ("Rewriting experience (2 of 3)…") — shown under the popup spinner.
  progress?: string
}

export interface CoverLetterEntry {
  id: string
  letter: string
  createdAt: string
}

export interface TailoredResumeEntry {
  id: string
  resume: TailoredResume
  createdAt: string
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
