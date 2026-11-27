import type { TailoredResume } from './pdf/types'
import { getCachedTier, getMode } from './storage'

export type ResumeLook = Pick<TailoredResume, 'template' | 'accent'>

export async function isCachedPro(): Promise<boolean> {
  return (await getMode()) === 'hosted' && (await getCachedTier()) === 'hosted_pro'
}

// Pro sells generations. An own key pays for its own, so it gets every template (#119).
export async function templatesUnlocked(): Promise<boolean> {
  return (await getMode()) === 'byok' || isCachedPro()
}

// The default for the next tailored resume (#119). The tailor function applies it for Pro, applySavedLook for an own key.
export async function getResumeLook(): Promise<ResumeLook> {
  const { resumeTemplate, resumeAccent } = await chrome.storage.local.get(['resumeTemplate', 'resumeAccent'])
  return { template: resumeTemplate as ResumeLook['template'], accent: resumeAccent as string | undefined }
}

// Own-key tailoring runs in the extension, so the server never applies the saved look to it (#119).
export async function applySavedLook(resume: TailoredResume): Promise<void> {
  const { template, accent } = await getResumeLook()
  if (template) resume.template = template
  if (accent) resume.accent = accent
}

export async function saveResumeLook(look: ResumeLook): Promise<void> {
  await chrome.storage.local.set({ ...(look.template && { resumeTemplate: look.template }), ...(look.accent && { resumeAccent: look.accent }) })
}
