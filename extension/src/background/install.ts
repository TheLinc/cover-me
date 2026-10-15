import { clearSavedLogin, getResume, saveResume } from '../lib/storage'

export const WELCOME_PATH = 'src/welcome/index.html'

// First install opens the welcome tab (account, then resume, then "open a
// posting"). Updates never do: existing users are already set up.
export async function handleInstalled(details: { reason: string; previousVersion?: string }): Promise<void> {
  await clearSavedLogin()
  if (details.reason === 'install') {
    await chrome.tabs.create({ url: chrome.runtime.getURL(WELCOME_PATH) })
  }
  // Builds before 1.3.0 parsed only the first 6,000 characters of the resume,
  // so a longer one lost its later sections (often education) in every
  // tailored resume. Drop that parse; the next tailor reads the whole resume.
  if (details.reason === 'update' && /^1\.[0-2]\./.test(details.previousVersion ?? '')) {
    const resume = await getResume()
    if (resume?.parsed && resume.text.length > 6000) {
      const { parsed: _truncated, ...rest } = resume
      await saveResume(rest)
    }
  }
}
