import type { JobData } from './types.ts'
import { jobFromJsonLd, jobFromMicrodata } from './jsonld.ts'
import { fromTabTitle } from './tabtitle.ts'

export function scrapeGeneric(): JobData {
  return jobFromJsonLd() ?? jobFromMicrodata() ?? tryAtsSelectors() ?? tryHeuristic()
}

function tryAtsSelectors(): JobData | null {
  // Covers Greenhouse, Lever, Ashby, Workable, BambooHR
  const title = firstText([
    '.job__title h1', // Greenhouse job-boards.greenhouse.io
    '.application-form-header--title', // Greenhouse job search pop-up, my.greenhouse.io
    '.selected-application-pane .section-header', // Greenhouse Applications page, my.greenhouse.io
    '[data-qa="job-title"]',
    '.posting-headline h2',
    '.job-title',
    '[class*="posting-title"]',
    'h1[class*="title"]',
  ])
  const description = firstText([
    '.job__description',
    '.application-description',
    '.selected-application-pane .job-post-contents',
    '[data-qa="job-description"]',
    '.posting-description',
    '[class*="job-description"]',
    '[class*="posting-description"]',
    '#job-detail-body .content', // amazon.jobs
    '#content',
  ])

  if (title && description) {
    const company = firstText(['[data-qa="company"]', '[class*="company-name"]', '.selected-application-pane .section-header + * > .section-title'])
      // job-boards.greenhouse.io names the company only in the tab title
      ?? fromTabTitle().company
    return { title, company, description, url: window.location.href }
  }
  return null
}

function tryHeuristic(): JobData {
  // Only use an h1 if it looks like a job title (not a nav/section heading,
  // nor the employer's or site's name). Else the tab title's job.
  const tab = fromTabTitle()
  const h1s = Array.from(document.querySelectorAll<HTMLElement>('h1'))
  const titleEl = h1s.find((el) => {
    const text = el.innerText?.trim() ?? ''
    return text.length > 2 && text.length < 120 && !isNavHeading(text) && !isSectionOrSiteHeading(text) &&
      text.toLowerCase() !== tab.company.toLowerCase()
  })
  // A listing's heading ("Open Roles") means there's no job to fall back to.
  const title = titleEl?.innerText.trim() ?? (h1s.some((el) => isNavHeading(el.innerText ?? '')) ? undefined : tab.title)

  // Find the largest text block that looks like a job description: not a list
  // of links, which is a job board's listing or a "similar jobs" panel.
  // Postings measured 0 to 21% link text, Greenhouse's board listing 95%.
  // Each block's text is measured once, and links nested in a link (linkedom
  // allows them) aren't read, so each block costs one walk of its subtree.
  // A block that opens with the title is the posting itself, without the page
  // around it (Google's careers page holds the posting beside a list of jobs).
  const nested = new Set(document.querySelectorAll('a a'))
  const blocks = Array.from(document.querySelectorAll<HTMLElement>('div, section, article'))
    .flatMap((el) => {
      // Only blocks in range keep their text: holding every block's would cost
      // elements x depth of memory on deep pages
      const text = el.innerText?.trim() ?? ''
      return text.length > 500 && text.length < 20000 ? [{ el, text }] : []
    })
    .sort((a, b) => b.text.length - a.text.length)
  const isPosting = ({ el, text }: { el: HTMLElement; text: string }) => linkTextLength(el, nested) < text.length / 2
  const description = (
    (title && blocks.filter(({ text }) => text.startsWith(title)).find(isPosting)) || blocks.find(isPosting)
  )?.text

  if (!title || !description || description.length < 200) {
    throw new Error(
      'Could not find job details on this page. Make sure you are on a specific job posting, not a listings page.',
    )
  }

  return { title, company: tab.company, description, url: window.location.href }
}

// Section headings some postings put in an <h1> ("Key Responsibilities",
// "job details"), and site names ("CAREERS", "MSC CAREER PORTAL").
function isSectionOrSiteHeading(text: string): boolean {
  return /^(?:key |main |your |the )?(?:responsibilities|duties|requirements|qualifications|overview|summary|benefits|(?:job )?(?:description|details)|about(?: us| the (?:role|job|team|company|position))?|join (?:our|the) team|what you.ll do|who we are)[.:!]?$/i.test(text) ||
    /^careers(?: at .+)?[.!]?$|\bcareers? (?:portal|site)$/i.test(text)
}

// Headings that indicate a listing/nav page rather than a specific job posting
function isNavHeading(text: string): boolean {
  const lower = text.toLowerCase()
  const navPhrases = [
    'job matches', 'job listings', 'search results', 'find jobs',
    'browse jobs', 'open positions', 'career opportunities', 'all jobs',
    'jobs at', 'we\'re hiring', 'open roles', 'current openings', 'job openings',
  ]
  return navPhrases.some((p) => lower.includes(p))
}

function linkTextLength(el: HTMLElement, nested: Set<Element>): number {
  return Array.from(el.querySelectorAll<HTMLElement>('a'))
    .reduce((n, a) => n + (nested.has(a) ? 0 : a.innerText?.trim().length ?? 0), 0)
}

function firstText(selectors: string[]): string | undefined {
  for (const sel of selectors) {
    const text = document.querySelector<HTMLElement>(sel)?.innerText?.trim()
    if (text) return text
  }
}

