import type { JobData } from '../../types'
import { jobFromJsonLd } from './jsonld'

export function scrapeLever(): JobData {
  const title = document.querySelector<HTMLElement>(
    '.posting-headline h2, [data-qa="posting-name"], h2.posting-name',
  )?.innerText?.trim()

  // JSON-LD has the legal name ("Palantir Technologies"); the URL path only
  // has the slug: jobs.lever.co/{company-slug}/...
  const companySlug = window.location.pathname.split('/').filter(Boolean)[0] ?? ''
  const company = jobFromJsonLd()?.company ?? (companySlug
    ? companySlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Unknown Company')

  // The posting is split into sections: intro, one per requirements list, and a
  // closing. [data-qa="job-description"] is only the intro.
  const sections = Array.from(document.querySelectorAll<HTMLElement>(
    '.section.page-centered:not(.posting-header):not(.last-section-apply)',
  )).map((s) => s.innerText?.trim()).filter(Boolean)
  const description = sections.join('\n\n') || document.querySelector<HTMLElement>(
    '[data-qa="job-description"], .posting-description, .posting-body',
  )?.innerText?.trim()

  if (!title || !description) {
    throw new Error('Could not find job details on this Lever page.')
  }

  return { title, company, description, url: window.location.href }
}
