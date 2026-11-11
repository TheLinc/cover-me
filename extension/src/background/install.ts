import { ensureValidSession } from '../lib/auth'
import { WEB_URL } from '../lib/config'
import { uploadDesignIfPro } from '../lib/design'
import { clearSavedLogin, getMode, getResume, saveResume, saveWhatsNew } from '../lib/storage'

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
  const majorMinor = (v: string) => v.split('.').slice(0, 2).join('.')
  if (details.reason === 'update' && details.previousVersion && majorMinor(details.previousVersion) !== majorMinor(version)) {
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
  await decideDesignNews(details.reason)
  if (details.reason === 'update') await sendSkippedDesign()
}

// Builds up to 1.7.0 skipped sending a Pro account's Word file when the
// extension's copy of the plan was out of date (#181), so the dashboard
// couldn't download resumes in the user's design. Sent on update, with the
// plan checked with the server. Remove once those builds are gone (#187).
async function sendSkippedDesign(): Promise<void> {
  try {
    if ((await getMode()) !== 'hosted') return
    const session = await ensureValidSession()
    if (session) await uploadDesignIfPro(session, true)
  } catch { /* the next tailor in the design tries again */ }
}

// The dot on the Resume tab telling existing users their Word file can now
// keep its design (#131). Decided once, on the first install or update that
// has this code: shown only to someone with a resume saved before then.
async function decideDesignNews(reason: string): Promise<void> {
  if (reason !== 'install' && reason !== 'update') return
  const { designNews } = await chrome.storage.local.get('designNews')
  if (designNews) return
  const resume = reason === 'update' ? await getResume() : null
  await chrome.storage.local.set({ designNews: resume && !resume.design ? 'pending' : 'seen' })
}

// Chrome opens this page when the extension is removed: a one-question survey
// on cover-me.dev. The account id goes only when signed in, so the answer can
// be linked to it; nothing else that identifies the user goes in the URL.
export function uninstallUrl(version: string, userId?: string): string {
  const params = new URLSearchParams({ v: version })
  if (userId) params.set('u', userId)
  return `${WEB_URL}/uninstalled?${params}`
}
