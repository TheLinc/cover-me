export type AIProvider = 'claude' | 'openai'

export interface Settings {
  provider: AIProvider
  apiKey: string // AES-GCM encrypted, stored in chrome.storage.local
}

export interface ResumeData {
  text: string
  filename: string
  updatedAt: string
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

export type GenerateResponse =
  | { success: true; letter: string; job: JobData }
  | { success: false; error: string }

export type ScrapeResponse =
  | { success: true; job: JobData }
  | { success: false; error: string }
