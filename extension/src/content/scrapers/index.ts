import type { JobData } from '../../types'
import { scrapeGeneric } from './generic'
import { scrapeIndeed } from './indeed'
import { scrapeLever } from './lever'
import { scrapeLinkedIn } from './linkedin'
import { scrapeTerminal } from './terminal'
import { scrapeWorkday } from './workday'

export function scrapeJobPage(): JobData {
  const { hostname } = window.location

  if (hostname.includes('linkedin.com')) return scrapeLinkedIn()
  if (hostname.includes('indeed.com')) return scrapeIndeed()
  if (hostname.includes('lever.co')) return scrapeLever()
  if (hostname.includes('myworkdayjobs.com')) return scrapeWorkday()
  if (hostname.includes('terminal.io')) return scrapeTerminal()
  return scrapeGeneric()
}
