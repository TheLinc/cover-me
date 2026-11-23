import { scrapeJobPage } from './scrapers/index.ts'
import type { FrameScrapeResponse } from '../types'
import { snapshotPage, type PageSnapshot } from './snapshot.ts'
import { handleAnswerMessage } from './answer-field.ts'
import { addLeverPostingJsonLd } from './lever-apply.ts'

// Injected on each click, so it can run more than once per page. Keyed by version: after an
// update a tab can hold the old script's flag with a dead listener (#232).
const flag = `__coverMeScraper_${chrome.runtime.getManifest().version}`
const w = window as typeof window & Record<string, true | undefined>

if (!w[flag]) {
  w[flag] = true
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    // Right-click answers (#232)
    if (typeof message.type === 'string' && message.type.startsWith('ANSWER_')) {
      handleAnswerMessage(message, sendResponse)
      return
    }
    if (message.type === 'SCRAPE_JOB') {
      void addLeverPostingJsonLd().catch(() => {}).then(() => {
        // Built only when it will be sent: serializing a big page isn't free (#29)
        let snapshot: PageSnapshot | null = null
        if (message.snapshot === true) {
          try {
            snapshot = snapshotPage()
          } catch {}
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
      })
      return true
    }
  })
}
