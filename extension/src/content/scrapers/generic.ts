import type { JobData } from '../../types'

export function scrapeGeneric(): JobData {
  return tryJsonLd() ?? tryAtsSelectors() ?? tryHeuristic()
}

function tryJsonLd(): JobData | null {
  const scripts = document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]')
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent ?? '') as Record<string, unknown>
      if (data['@type'] === 'JobPosting') {
        const title = (data.title ?? data.name) as string | undefined
        const org = data.hiringOrganization as Record<string, string> | string | undefined
        const company = typeof org === 'object' ? org.name : (org ?? 'Unknown Company')
        const description = stripHtml((data.description as string | undefined) ?? '')
        if (title && description) {
          return { title, company, description, url: window.location.href }
        }
      }
    } catch {
      // malformed JSON-LD — continue
    }
  }
  return null
}

function tryAtsSelectors(): JobData | null {
  // Covers Greenhouse, Lever, Ashby, Workable, BambooHR
  const title = firstText([
    '[data-qa="job-title"]',
    '.posting-headline h2',
    '.job-title',
    '[class*="posting-title"]',
    'h1[class*="title"]',
  ])
  const description = firstText([
    '[data-qa="job-description"]',
    '.posting-description',
    '[class*="job-description"]',
    '[class*="posting-description"]',
    '#content',
  ])

  if (title && description) {
    const company = firstText(['[data-qa="company"]', '[class*="company-name"]']) ?? 'Unknown Company'
    return { title, company, description, url: window.location.href }
  }
  return null
}

function tryHeuristic(): JobData {
  // Only use an h1 if it looks like a job title (not a nav/section heading)
  const h1s = Array.from(document.querySelectorAll<HTMLElement>('h1'))
  const titleEl = h1s.find((el) => {
    const text = el.innerText?.trim() ?? ''
    return text.length > 2 && text.length < 120 && !isNavHeading(text)
  })

  // Find the largest text block that looks like a job description
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('div, section, article'))
    .filter((el) => {
      const len = el.innerText?.trim().length ?? 0
      return len > 500 && len < 20000
    })
    .sort((a, b) => b.innerText.length - a.innerText.length)

  const description = candidates[0]?.innerText?.trim()

  if (!titleEl || !description || description.length < 200) {
    throw new Error(
      'Could not find job details on this page. Make sure you are on a specific job posting (not a listings page), or navigate to a supported site.',
    )
  }

  return { title: titleEl.innerText.trim(), company: 'Unknown Company', description, url: window.location.href }
}

// Headings that indicate a listing/nav page rather than a specific job posting
function isNavHeading(text: string): boolean {
  const lower = text.toLowerCase()
  const navPhrases = [
    'job matches', 'job listings', 'search results', 'find jobs',
    'browse jobs', 'open positions', 'career opportunities', 'all jobs',
    'jobs at', 'we\'re hiring',
  ]
  return navPhrases.some((p) => lower.includes(p))
}

function firstText(selectors: string[]): string | undefined {
  for (const sel of selectors) {
    const text = document.querySelector<HTMLElement>(sel)?.innerText?.trim()
    if (text) return text
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}
