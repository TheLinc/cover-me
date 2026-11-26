import type { ResumeTemplate } from './pdf/types'
import { getCachedTier, getMode } from './storage'

export async function isCachedPro(): Promise<boolean> {
  return (await getMode()) === 'hosted' && (await getCachedTier()) === 'hosted_pro'
}

// The default for the next tailored resume (#119). The tailor function applies it only for Pro.
export async function getResumeTemplate(): Promise<ResumeTemplate | undefined> {
  const { resumeTemplate } = await chrome.storage.local.get('resumeTemplate')
  return resumeTemplate as ResumeTemplate | undefined
}

export async function saveResumeTemplate(template: ResumeTemplate): Promise<void> {
  await chrome.storage.local.set({ resumeTemplate: template })
}
