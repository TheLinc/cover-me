import { isSupportedHost, scraperFor } from '../content/scrapers/index.ts'
import type { ScrapeFailure } from '../types'

// Sorts a click that read no job into what the popup offers (#130): a site we
// don't read yet (ask for it), a supported board that failed (report it), or
// no web page at all. tabUrl: the address bar. frameUrls: the frames that were
// scraped, empty when Chrome wouldn't let the extension script the tab (its
// own pages, the PDF viewer, the Web Store). errorFrameUrl: the frame whose
// scraper raised the error shown, if one did.
export function scrapeFailure(tabUrl: string | undefined, frameUrls: string[], error: string, errorFrameUrl?: string): ScrapeFailure {
  const tab = tabUrl && URL.canParse(tabUrl) ? new URL(tabUrl) : null
  if (!tab || !/^https?:$/.test(tab.protocol) || /\.pdf$/i.test(tab.pathname) || frameUrls.length === 0) {
    return { reason: 'not_web', host: '', error }
  }
  const hostOf = (url: string) => (URL.canParse(url) ? new URL(url).hostname : '')
  const failed = [errorFrameUrl, ...frameUrls].find((url) => url && isSupportedHost(hostOf(url)))
  if (failed) {
    const host = hostOf(failed)
    return { reason: 'failed', host: host.replace(/^www\./, ''), url: failed, scraper: scraperFor(host), error }
  }
  return { reason: 'unsupported', host: tab.hostname.replace(/^www\./, ''), error }
}
