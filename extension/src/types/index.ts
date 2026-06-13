export type AIProvider = 'claude' | 'openai'
export type AppMode = 'byok' | 'hosted'

export interface Settings {
  provider: AIProvider
  apiKey: string // AES-GCM encrypted, stored in chrome.storage.local
  mode: AppMode  // 'byok' (default) or 'hosted'
}

export interface JobData {
  title: string
  company: string
  description: string
  url: string
}

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
  | { success: false; error: string; errorCode?: 'RATE_LIMIT' }

export type TailorResponse =
  | { success: true; resume: TailoredResume; job: JobData }
  | { success: false; error: string; errorCode?: 'RATE_LIMIT' }

export type ScrapeResponse =
  | { success: true; job: JobData }
  | { success: false; error: string }

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
