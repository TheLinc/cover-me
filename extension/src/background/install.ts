import { clearSavedLogin } from '../lib/storage'

export const WELCOME_PATH = 'src/welcome/index.html'

// First install opens the welcome tab (account, then resume, then "open a
// posting"). Updates never do: existing users are already set up.
export async function handleInstalled(details: { reason: string }): Promise<void> {
  await clearSavedLogin()
  if (details.reason === 'install') {
    await chrome.tabs.create({ url: chrome.runtime.getURL(WELCOME_PATH) })
  }
}
