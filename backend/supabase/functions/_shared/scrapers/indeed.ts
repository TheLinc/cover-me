import type { JobData } from './types.ts'
import { jobFromJsonLd } from './jsonld.ts'

// Current layout (seen 2026-10): the search page's right-hand pane and the
// full /viewjob page render the same detail component, with stable data-testids
// and no #jobDescriptionText. The description is the element after the
// "Full job description" heading.
//
// Older layouts, kept while Indeed rolls the new one out:
// 1. Search results page — left list + right detail panel
//    Selected job identified by aria-pressed="true" on the listing anchor.
//    Title and company live in that listing card; description in #jobDescriptionText.
// 2. Full job page (/viewjob?jk=...) — single job, title in h1/h2 header.

export function scrapeIndeed(): JobData {
  const paneTitle = firstText(['[data-testid="vj-job-title"]'])
  const paneDescription = firstText(['[data-testid="vj-job-description-heading"] + *'])
  if (paneTitle && paneDescription) {
    return {
      title: paneTitle,
      company: firstText(['[data-testid="vj-company-name"]']) ?? 'Unknown Company',
      description: paneDescription,
      url: window.location.href,
    }
  }

  // Description is in the right panel on both older layouts
  const description = firstText([
    '#jobDescriptionText',
    '[id*="jobDescription"]',
    '[class*="jobsearch-jobDescriptionText"]',
  ])

  // ── Layout 1: search results with selected listing ────────────────────
  const fromListing = scrapeFromSelectedListing()
  if (fromListing && description) {
    return { ...fromListing, description, url: window.location.href }
  }

  // ── Layout 2: full job page ───────────────────────────────────────────
  const title = firstText([
    'h1[data-testid="jobsearch-JobInfoHeader-title"]',
    'h1.jobsearch-JobInfoHeader-title',
    'h1[class*="JobInfoHeader"]',
    'h1[class*="jobTitle"]',
    'h2[class*="jobTitle"]',
  ])
  const company = firstText([
    '[data-testid="inlineHeader-companyName"] a',
    '[data-company-name] a',
    '.jobsearch-CompanyInfoWithoutHeaderImage a',
    '[data-testid="company-name"]',
  ])

  if (!title || !description) {
    // /viewjob pages carry a JobPosting JSON-LD block (the search page doesn't)
    const fromLd = jobFromJsonLd()
    if (fromLd) return fromLd
    throw new Error(
      'Could not find job details on this Indeed page. ' +
      'Try clicking the job title to open the full job page, then generate again.',
    )
  }

  return {
    title,
    company: company ?? 'Unknown Company',
    description,
    url: window.location.href,
  }
}

// On the search results page, the selected listing has aria-pressed="true"
// on its anchor. Title and company are inside that same listing card.
function scrapeFromSelectedListing(): { title: string; company: string } | null {
  const selectedLink = document.querySelector<HTMLAnchorElement>('a[aria-pressed="true"]')
  if (!selectedLink) return null

  // Title is in the span inside the selected anchor
  const titleEl = selectedLink.querySelector<HTMLElement>('[id^="jobTitle-"], span[title]')
  const title = titleEl?.innerText?.trim() || titleEl?.getAttribute('title') || undefined
  if (!title) return null

  // Company is in [data-testid="company-name"] within the same listing card.
  // Walk up from the anchor until we find a container that holds it.
  let company = 'Unknown Company'
  let el: HTMLElement | null = selectedLink.parentElement
  while (el && el !== document.body) {
    const companyEl = el.querySelector<HTMLElement>('[data-testid="company-name"]')
    if (companyEl?.innerText?.trim()) {
      company = companyEl.innerText.trim()
      break
    }
    el = el.parentElement
  }

  return { title, company }
}

function firstText(selectors: string[]): string | undefined {
  for (const sel of selectors) {
    const text = document.querySelector<HTMLElement>(sel)?.innerText?.trim()
    if (text) return text
  }
}
