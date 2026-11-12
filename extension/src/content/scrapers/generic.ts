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
      // job-boards.greenhouse.io names the company only in the tab title,
      // which its embeds (/embed/job_app?for=...) don't put in the path
      // (not on long titles: the pattern retries at every " at ")
      ?? (document.title.length <= 300 ? document.title : '').match(/^Job Application for .+ at (.+)$/)?.[1]?.trim()
      ?? fromTabTitle().company
    return { title, company, description, url: window.location.href }
  }
  return null
}

function tryHeuristic(): JobData {
  // An <h1> is the title when it reads like one: not a listing, section or site
  // heading, nor the employer's name. In place of an <h1> rejected for being a
  // section or site heading or the employer, the tab title's job; failing that,
  // a section heading, since the page is a posting and the user can fix the
  // title. A site heading alone ("Careers at Acme") isn't a job, so a posting
  // embedded in a frame of that page wins. Pages with no such <h1> (none, a
  // logo, a long hero line) never fall back, as before.
  const tab = fromTabTitle()
  const company = tab.company.toLowerCase()
  const notTitle = (t: string) => isNavHeading(t) || isSectionHeading(t) || isSiteHeading(t) || t.toLowerCase() === company
  // Only headings of title length are kept: every <h1>'s text would cost
  // elements x depth of memory on nested ones.
  const h1s = Array.from(document.querySelectorAll<HTMLElement>('h1')).flatMap((el) => {
    const text = el.innerText?.trim() ?? ''
    return text.length > 2 && text.length < 120 ? [text] : []
  })
  const rejected = h1s.some((t) => isSectionHeading(t) || isSiteHeading(t) || t.toLowerCase() === company)
  const tabJob = tab.title && !notTitle(tab.title) ? tab.title : undefined
  const title = h1s.find((t) => !notTitle(t)) ?? (rejected ? tabJob ?? h1s.find(isSectionHeading) : undefined)

  // The posting's own container when the page marks it with the job's ID.
  // Else the largest text block that looks like a job description: not a list
  // of links, which is a job board's listing or a "similar jobs" panel.
  // Postings measured 0 to 21% link text, Greenhouse's board listing 95%.
  // Each block's text is measured once, and links nested in a link (linkedom
  // allows them) aren't read, so each block costs one walk of its subtree.
  const nested = new Set(document.querySelectorAll('a a'))
  const description = postingById() ?? Array.from(document.querySelectorAll<HTMLElement>('div, section, article'))
    .map((el) => ({ el, len: el.innerText?.trim().length ?? 0 }))
    .filter(({ len }) => len > 500 && len < 20000)
    .sort((a, b) => b.len - a.len)
    .find(({ el, len }) => linkTextLength(el, nested) < len / 2)
    ?.el.innerText.trim()

  if (!title || !description || description.length < 200) {
    throw new Error(
      'Could not find job details on this page. Make sure you are on a specific job posting, not a listings page.',
    )
  }

  return { title, company: tab.company, description, url: window.location.href }
}

// Google's careers page puts the posting in a pane marked with the job's ID
// from the URL (data-id), beside a list of other jobs that's larger than it.
// The ID's entry in that list is the shorter of the two. The first three
// numbers in the path are tried, each one query.
function postingById(): string | undefined {
  for (const id of (window.location.pathname.match(/\d{6,}/g) ?? []).slice(0, 3)) {
    const text = Array.from(document.querySelectorAll<HTMLElement>(`[data-id="${id}"]`), (el) => el.innerText?.trim() ?? '')
      .sort((a, b) => b.length - a.length)[0]
    if (text && text.length > 500) return text
  }
}

// Section headings some postings put in an <h1> ("Key Responsibilities",
// "job details").
function isSectionHeading(text: string): boolean {
  return /^(?:key |main |your |the )?(?:responsibilities|duties|requirements|qualifications|overview|summary|benefits|(?:job )?(?:description|details)|about(?: us| the (?:role|job|team|company|position))?|join (?:our|the) team|what you.ll do|who we are)[.:!]?$/i.test(text)
}

// Site names in an <h1> ("CAREERS", "MSC CAREER PORTAL").
function isSiteHeading(text: string): boolean {
  return /^careers(?: at .+)?[.!]?$|\bcareers? (?:portal|site)$/i.test(text)
}

// Headings that indicate a listing/nav page rather than a specific job posting
function isNavHeading(text: string): boolean {
  const lower = text.toLowerCase()
  const navPhrases = [
    'job matches', 'job listings', 'search results', 'find jobs',
    'browse jobs', 'open positions', 'career opportunities', 'all jobs',
    'jobs at', 'we\'re hiring', 'open roles', 'current openings', 'job openings', 'search jobs',
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

