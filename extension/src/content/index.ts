import { scrapeJobPage } from './scrapers'

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
