import { scrapeJobPage } from './scrapers'

// Injected by the background on each click (activeTab), not declared in the
// manifest, so it can run more than once per page. Register the listener once.
const flag = '__coverMeScraper' as const
const w = window as typeof window & { [flag]?: true }

if (!w[flag]) {
  w[flag] = true
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'SCRAPE_JOB') {
      try {
        const job = scrapeJobPage()
        sendResponse({ success: true, job })
      } catch (err) {
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : 'Could not scrape this page',
        })
      }
      return true
    }
  })
}
