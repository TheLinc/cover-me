import type { JobData } from '../../types'

export function scrapeLever(): JobData {
  const title = document.querySelector<HTMLElement>(
    '.posting-headline h2, [data-qa="posting-name"], h2.posting-name',
  )?.innerText?.trim()

  // Company name lives in the URL path: jobs.lever.co/{company-slug}/...
  const companySlug = window.location.pathname.split('/').filter(Boolean)[0] ?? ''
  const company = companySlug
    ? companySlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Unknown Company'

  const description = document.querySelector<HTMLElement>(
    '[data-qa="job-description"], .posting-description, .posting-body',
  )?.innerText?.trim()

  if (!title || !description) {
    throw new Error('Could not find job details on this Lever page.')
  }

  return { title, company, description, url: window.location.href }
}
