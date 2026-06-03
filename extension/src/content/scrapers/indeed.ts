import type { JobData } from '../../types'

export function scrapeIndeed(): JobData {
  const titleEl = document.querySelector<HTMLElement>(
    'h1[data-testid="jobsearch-JobInfoHeader-title"], h1.jobsearch-JobInfoHeader-title, h1[class*="JobInfoHeader"]',
  )
  const companyEl = document.querySelector<HTMLElement>(
    '[data-testid="inlineHeader-companyName"] a, [data-company-name] a, .jobsearch-CompanyInfoWithoutHeaderImage a',
  )
  const descEl = document.querySelector<HTMLElement>(
    '#jobDescriptionText, [id*="jobDescription"], [class*="jobsearch-jobDescriptionText"]',
  )

  const title = titleEl?.innerText?.trim()
  const description = descEl?.innerText?.trim()

  if (!title || !description) {
    throw new Error('Could not find job details on this Indeed page.')
  }

  return {
    title,
    company: companyEl?.innerText?.trim() ?? 'Unknown Company',
    description,
    url: window.location.href,
  }
}
