import { scrapeJobPage } from './scrapers/index.ts'
import type { FrameScrapeResponse } from '../types'
import { snapshotPage, type PageSnapshot } from './snapshot.ts'

// Injected by the background on each click (activeTab), not declared in the
// manifest, so it can run more than once per page. Register the listener once.
const flag = '__coverMeScraper' as const
const w = window as typeof window & { [flag]?: true }

if (!w[flag]) {
  w[flag] = true
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'SCRAPE_JOB') {
      let snapshot: PageSnapshot | null = null
      try {
        snapshot = snapshotPage()
      } catch {
        // the bundled scrapers below still run
      }
      try {
        const job = scrapeJobPage()
        sendResponse({ success: true, job, snapshot } satisfies FrameScrapeResponse)
      } catch (err) {
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : 'Could not scrape this page',
          snapshot,
        } satisfies FrameScrapeResponse)
      }
      return true
    }
  })
}
