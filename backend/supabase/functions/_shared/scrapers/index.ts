import type { JobData } from './types.ts'
import { scrapeBambooHR } from './bamboohr.ts'
import { scrapeGeneric } from './generic.ts'
import { scrapeIndeed } from './indeed.ts'
import { scrapeLever } from './lever.ts'
import { scrapeLinkedIn } from './linkedin.ts'
import { scrapeTerminal } from './terminal.ts'
import { scrapeWorkday } from './workday.ts'

export function scrapeJobPage(): JobData {
  const { hostname } = window.location

  if (hostname.includes('linkedin.com')) return scrapeLinkedIn()
  if (hostname.includes('indeed.com')) return scrapeIndeed()
  if (hostname.includes('lever.co')) return scrapeLever()
  if (hostname.includes('myworkdayjobs.com')) return scrapeWorkday()
  if (hostname.includes('bamboohr.com')) return scrapeBambooHR()
  if (hostname.includes('terminal.io')) return scrapeTerminal()
  return scrapeGeneric()
}
