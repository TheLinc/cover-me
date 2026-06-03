import type { JobData } from '../../types'

export function scrapeWorkday(): JobData {
  // Workday's data-automation-id attributes are stable across tenants and versions
  const title = document.querySelector<HTMLElement>(
    '[data-automation-id="jobPostingHeader"]',
  )?.innerText?.trim()

  const description = document.querySelector<HTMLElement>(
    '[data-automation-id="jobPostingDescription"]',
  )?.innerText?.trim()

  // Company from subdomain: {company}.wd1.myworkdayjobs.com
  const subdomain = window.location.hostname.split('.')[0] ?? ''
  const company = subdomain
    ? subdomain.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Unknown Company'

  if (!title || !description) {
    throw new Error(
      'Could not find job details on this Workday page. The page may still be loading — try again in a moment.',
    )
  }

  return { title, company, description, url: window.location.href }
}
