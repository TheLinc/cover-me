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
  const description = postingById() ?? largestBlock()

  if (!title || !description || description.length < 200) {
    throw new Error(
      'Could not find job details on this page. Make sure you are on a specific job posting, not a listings page.',
    )
  }

  return { title, company: tab.company, description, url: window.location.href }
}

// The largest text block that looks like a job description: not a list of
// links or job cards, which is a job board's listing or a "similar jobs"
// panel. Postings measured 0 to 21% link text, Greenhouse's board listing 95%.
// A card's plain text (location, summary) counts as the list's, since listings
// whose cards carry it measured under half link text (#72). Each block's text
// is measured once, and links nested in a link (linkedom allows them) aren't
// read, so each block costs one walk of its subtree.
function largestBlock(): string | undefined {
  const nested = new Set(document.querySelectorAll('a a'))
  const cards = cardLists(nested)
  const cardText = new Map<Element, number>()
  for (const [list, plain] of cards) {
    for (let el: Element | null = list; el; el = el.parentElement) cardText.set(el, (cardText.get(el) ?? 0) + plain)
  }
  // A block in a card is the card or part of it (a long one: We Work Remotely's
  // list the countries a job is open to)
  const inCard = (el: Element) => {
    for (let p = el.parentElement; p; p = p.parentElement) if (cards.has(p as HTMLElement)) return true
    return false
  }
  const block = Array.from(document.querySelectorAll<HTMLElement>('div, section, article'))
    .map((el) => ({ el, len: el.innerText?.trim().length ?? 0 }))
    .filter(({ len }) => len > 500 && len < 20000)
    .sort((a, b) => b.len - a.len)
    .find(({ el, len }) => linkTextLength(el, nested) + (cardText.get(el) ?? 0) < len * 0.4 && !inCard(el))
    ?.el
  if (!block) return
  // Without the cards in it (a related-jobs panel). A page whose cards
  // outweigh what's left is a listing, and the block its intro.
  let text = block.innerText.trim()
  let most = 0
  for (const [list, plain] of cards) {
    most = Math.max(most, plain)
    if (block.contains(list)) text = text.replace(list.innerText.trim(), '').replace(/\n{3,}/g, '\n\n').trim()
  }
  return text.length > most ? text : undefined
}

// Repeated cards: an element with at least three children of one shape (block
// tag and class) that each hold a link to a different place, making up half
// its children or more, none of them holding half its text. A job list,
// whatever plain text each card carries, but also a site's menus; not
// paragraphs with a link each (a posting's EEO notes), nor a page's sections
// of one class around a posting. The outermost lists only, each with its text
// outside links. Each element's first link is found in one pass over the links.
function cardLists(nested: Set<Element>): Map<HTMLElement, number> {
  const firstLink = new Map<Element, string>()
  for (const a of Array.from(document.querySelectorAll('a[href]'))) {
    for (let el: Element | null = a; el && !firstLink.has(el); el = el.parentElement) firstLink.set(el, a.getAttribute('href')!)
  }
  const lists = new Set<Element>()
  const seen = new Set<Element>()
  for (const child of firstLink.keys()) {
    const parent = child.parentElement
    if (!parent || seen.has(parent)) continue
    seen.add(parent)
    const shapes = new Map<string, { hrefs: Set<string>, cards: Element[] }>()
    for (const kid of Array.from(parent.children)) {
      const href = firstLink.get(kid)
      if (href === undefined || !CARD_TAGS.has(kid.tagName)) continue
      const shape = `${kid.tagName} ${kid.getAttribute('class') ?? ''}`
      const group = shapes.get(shape) ?? { hrefs: new Set(), cards: [] }
      group.hrefs.add(href)
      group.cards.push(kid)
      shapes.set(shape, group)
    }
    const isList = ({ hrefs, cards }: { hrefs: Set<string>, cards: Element[] }) => {
      if (hrefs.size < 3 || hrefs.size * 2 < parent.children.length) return false
      const total = parent.textContent?.length ?? 0
      return cards.every((card) => (card.textContent?.length ?? 0) * 2 < total)
    }
    if (Array.from(shapes.values()).some(isList)) lists.add(parent)
  }
  const outermost = new Map<HTMLElement, number>()
  for (const list of lists) {
    let inner = false
    for (let el = list.parentElement; el && !inner; el = el.parentElement) inner = lists.has(el)
    const el = list as HTMLElement
    if (!inner) outermost.set(el, (el.innerText?.trim().length ?? 0) - linkTextLength(el, nested))
  }
  return outermost
}

const CARD_TAGS = new Set(['LI', 'DIV', 'ARTICLE', 'SECTION', 'TR'])

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

