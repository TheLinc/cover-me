import { WEB_URL } from '../lib/config'
import { clearSavedLogin, getResume, saveResume, saveWhatsNew } from '../lib/storage'

export const WELCOME_PATH = 'src/welcome/index.html'

// First install opens the welcome tab (account, then resume, then "open a
// posting"). Updates never do: existing users are already set up.
export async function handleInstalled(details: { reason: string; previousVersion?: string }): Promise<void> {
  await clearSavedLogin()
  if (details.reason === 'install') {
    await chrome.tabs.create({ url: chrome.runtime.getURL(WELCOME_PATH) })
  }
  // A new minor or major version lights the popup's "What's new" link. Patches
  // don't: most releases are patches, and a dot on each would be ignored. A
  // fresh install sets nothing, so its version counts as seen.
  const version = chrome.runtime.getManifest().version
  const minor = (v: string) => v.split('.').slice(0, 2).join('.')
  if (details.reason === 'update' && details.previousVersion && minor(details.previousVersion) !== minor(version)) {
    await saveWhatsNew(version)
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

// Chrome opens this page when the extension is removed: a one-question survey
// on cover-me.dev. The account id goes only when signed in, so the answer can
// be linked to it; nothing else that identifies the user goes in the URL.
export function uninstallUrl(version: string, userId?: string): string {
  const params = new URLSearchParams({ v: version })
  if (userId) params.set('u', userId)
  return `${WEB_URL}/uninstalled?${params}`
}
