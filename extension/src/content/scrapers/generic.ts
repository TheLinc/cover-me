import type { JobData } from './types.ts'
import { jobFromJsonLd, jobFromMicrodata } from './jsonld.ts'
import { fromTabTitle } from './tabtitle.ts'

export function scrapeGeneric(): JobData {
  return jobFromJsonLd() ?? jobFromMicrodata() ?? tryPythonJobBoard() ?? tryAtsSelectors() ?? tryHeuristic()
}

// python.org's job board: a jobs-count banner <h1> ("20 jobs on the Python Job
// Board") comes first, and the posting's own <h1> holds the title, a "New"
// badge, then the company after a <br> (#73). The title and company are its
// text nodes.
function tryPythonJobBoard(): JobData | null {
  if (!/(?:^|\.)python\.org$/.test(window.location.hostname)) return null
  const heading = document.querySelector('.listing-company .company-name')
  const description = firstText(['.job-description'])
  if (!heading || !description) return null
  const [title, company] = Array.from(heading.childNodes)
    .flatMap((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim() ? [n.textContent.trim()] : [])
  if (!title) return null
  return { title, company: company ?? 'Unknown Company', description, url: window.location.href }
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
  // The first <h1> that isn't a listing heading is the title when it reads like
  // one: not a section or site heading, nor the employer's name. In its place,
  // the tab title's job; failing that, the heading itself, as before, since the
  // page holds a posting and the user can fix the title. Not a later <h1>: it
  // can be a hidden dialog's (Shopify's "Do Not Sell/Share My Personal
  // Information"). A page whose URL names an embedded posting (Greenhouse's
  // gh_jid, Ashby's ashby_jid) fails instead, so the posting's frame wins.
  // Pages with no such <h1> (none, a logo, a long hero line) fail, as before.
  const tab = fromTabTitle()
  const company = tab.company.toLowerCase()
  const notTitle = (t: string) => isNavHeading(t) || isSectionHeading(t) || isSiteHeading(t) || t.toLowerCase() === company
  // Only headings of title length are kept: every <h1>'s text would cost
  // elements x depth of memory on nested ones.
  const h1s = Array.from(document.querySelectorAll<HTMLElement>('h1')).flatMap((el) => {
    const text = el.innerText?.trim() ?? ''
    return text.length > 2 && text.length < 120 ? [text] : []
  })
  const first = h1s.find((t) => !isNavHeading(t))
  const embedded = /[?&](?:gh_jid|ashby_jid)=/.test(window.location.search)
  const tabJob = tab.title && !notTitle(tab.title) ? tab.title : undefined
  const title = first && (notTitle(first) ? tabJob ?? (embedded ? undefined : first) : first)

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
// The ID's entry in that list is the shorter of the two. The URL and page are
// the caller's to choose, so the cost is capped: three distinct numbers from
// the path, the first three blocks marked with each (one walk of each one's
// subtree); only lengths are kept, and the longest one's text is read again.
function postingById(): string | undefined {
  for (const id of [...new Set(window.location.pathname.match(/\d{6,}/g))].slice(0, 3)) {
    let best: HTMLElement | undefined
    let bestLen = 500
    const marked = ['div', 'section', 'article'].map((tag) => `${tag}[data-id="${id}"]`).join(',')
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(marked)).slice(0, 3)) {
      const len = el.innerText?.trim().length ?? 0
      if (len > bestLen) [best, bestLen] = [el, len]
    }
    if (best) return best.innerText.trim()
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

