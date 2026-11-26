import type { TailoredResume } from './pdf/types'
import { getCachedTier, getMode } from './storage'

export type ResumeLook = Pick<TailoredResume, 'template' | 'accent'>

export async function isCachedPro(): Promise<boolean> {
  return (await getMode()) === 'hosted' && (await getCachedTier()) === 'hosted_pro'
}

// The default for the next tailored resume (#119). The tailor function applies it only for Pro.
export async function getResumeLook(): Promise<ResumeLook> {
  const { resumeTemplate, resumeAccent } = await chrome.storage.local.get(['resumeTemplate', 'resumeAccent'])
  return { template: resumeTemplate as ResumeLook['template'], accent: resumeAccent as string | undefined }
}

export async function saveResumeLook(look: ResumeLook): Promise<void> {
  await chrome.storage.local.set({ ...(look.template && { resumeTemplate: look.template }), ...(look.accent && { resumeAccent: look.accent }) })
}
