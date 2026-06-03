import type { JobData } from '../../types'

// LinkedIn DOM selectors change frequently — ordered by most to least current.
const TITLE_SELECTORS = [
  'h1.top-card-layout__title',
  'h1.jobs-unified-top-card__job-title',
  '.job-details-jobs-unified-top-card__job-title h1',
  'h1[class*="title"]',
]

const COMPANY_SELECTORS = [
  'a.topcard__org-name-link',
  '.jobs-unified-top-card__company-name a',
  '.job-details-jobs-unified-top-card__company-name a',
  '.job-details-jobs-unified-top-card__primary-description a',
]

const DESC_SELECTORS = [
  '#job-details',
  '.jobs-description__content',
  '.jobs-description-content__text',
  '[class*="description__content"]',
  '.jobs-box__html-content',
]

function first(selectors: string[]): string | undefined {
  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel)
    const text = el?.innerText?.trim()
    if (text) return text
  }
}

export function scrapeLinkedIn(): JobData {
  const title = first(TITLE_SELECTORS)
  const description = first(DESC_SELECTORS)

  if (!title || !description) {
    throw new Error(
      'Could not find job details on this LinkedIn page. Make sure you are on a job posting.',
    )
  }

  return {
    title,
    company: first(COMPANY_SELECTORS) ?? 'Unknown Company',
    description,
    url: window.location.href,
  }
}
