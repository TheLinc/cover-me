import type { JobData } from './types.ts'
import { scrapeBambooHR } from './bamboohr.ts'
import { scrapeGeneric } from './generic.ts'
import { scrapeIndeed } from './indeed.ts'
import { scrapeLever } from './lever.ts'
import { scrapeLinkedIn } from './linkedin.ts'
import { scrapeTerminal } from './terminal.ts'
import { scrapeWorkday } from './workday.ts'

// The boards Cover Me supports, by the slug web/lib/boards.ts uses, with the
// host each one's pages are on. A failure on one of these is a bug the user
// can report; anywhere else, they can ask for the site (#130). Greenhouse,
// Ashby and Workable have no scraper of their own: the generic one reads them.
export const SUPPORTED_SITES = {
  linkedin: 'linkedin.com',
  indeed: 'indeed.com',
  greenhouse: 'greenhouse.io',
  lever: 'lever.co',
  workday: 'myworkdayjobs.com',
  ashby: 'ashbyhq.com',
  bamboohr: 'bamboohr.com',
  terminal: 'terminal.io',
  workable: 'workable.com',
} as const

const SCRAPERS = {
  linkedin: scrapeLinkedIn,
  indeed: scrapeIndeed,
  lever: scrapeLever,
  workday: scrapeWorkday,
  bamboohr: scrapeBambooHR,
  terminal: scrapeTerminal,
  generic: scrapeGeneric,
}
export type ScraperName = keyof typeof SCRAPERS
export const SCRAPER_NAMES = Object.keys(SCRAPERS) as ScraperName[]

// By suffix, so ca.linkedin.com and acme.wd5.myworkdayjobs.com match.
const onHost = (hostname: string, host: string) => hostname === host || hostname.endsWith('.' + host)

export function isSupportedHost(hostname: string): boolean {
  return Object.values(SUPPORTED_SITES).some((host) => onHost(hostname, host))
}

// Which scraper reads a page on this host.
export function scraperFor(hostname: string): ScraperName {
  return SCRAPER_NAMES.find((name) => name !== 'generic' && onHost(hostname, SUPPORTED_SITES[name])) ?? 'generic'
}

export function scrapeJobPage(): JobData {
  return SCRAPERS[scraperFor(window.location.hostname)]()
}
