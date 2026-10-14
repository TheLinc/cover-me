import { clearSavedLogin, showPageReadNotice } from '../lib/storage'

export const WELCOME_PATH = 'src/welcome/index.html'

// The first version that sends the page copy to the server in every mode.
const PAGE_READ_SINCE = '1.3.0'

// First install opens the welcome tab (account, then resume, then "open a
// posting"). Updates never do: existing users are already set up. A new
// install, or an update from before 1.3.0, gets the notice about how job
// pages are read the next time the popup opens.
export async function handleInstalled(details: { reason: string; previousVersion?: string }): Promise<void> {
  await clearSavedLogin()
  if (details.reason === 'install') {
    await showPageReadNotice()
    await chrome.tabs.create({ url: chrome.runtime.getURL(WELCOME_PATH) })
  } else if (details.reason === 'update' && isBefore(details.previousVersion, PAGE_READ_SINCE)) {
    await showPageReadNotice()
  }
}

// "1.2.0" < "1.3.0", numerically per part. A missing or unreadable version
// counts as older, so the notice errs on showing.
export function isBefore(version: string | undefined, than: string): boolean {
  if (!version) return true
  const a = version.split('.').map(Number)
  const b = than.split('.').map(Number)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (Number.isNaN(x)) return true
    if (x !== y) return x < y
  }
  return false
}
