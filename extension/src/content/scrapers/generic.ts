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
  const description = postingById() ?? largestBlock(first !== undefined && notTitle(first) && !tabJob)

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
// The block's card lists (a related-jobs panel) are cut from its text, and a
// block left with too little to be a posting is passed over: the panel's own
// block. Should that leave none, master's pick is read whole: a posting whose
// sections look like cards (each ends in a "Learn more" link). Under a heading that isn't a job's title ("Join Our Team"), with none
// in the tab title either, the page is in doubt: a block a third or more links
// and card text is a list, and one outweighed by any list on the page makes
// the page a listing. The listings in #72 measured under half link text, a
// Greenhouse board under a long intro 49%. Each block's text is measured once,
// and links nested in a link (linkedom allows them) aren't read, so each block
// costs one walk of its subtree and one of its ancestors.
function largestBlock(doubtful: boolean): string | undefined {
  const nested = new Set(document.querySelectorAll('a a'))
  const [lists, hiddenLists] = cardLists(nested)
  const holdsHidden = new Set<Element>()
  for (const list of hiddenLists) {
    for (let el: Element | null = list; el && !holdsHidden.has(el); el = el.parentElement) holdsHidden.add(el)
  }
  const cardText = new Map<Element, number>()
  const listText = new Map<Element, number>()
  for (const [list, { text, plain }] of lists) {
    for (let el: Element | null = list; el; el = el.parentElement) {
      cardText.set(el, (cardText.get(el) ?? 0) + plain)
      listText.set(el, (listText.get(el) ?? 0) + text.length)
    }
  }
  const isList = (el: HTMLElement, len: number) => doubtful
    ? linkTextLength(el, nested) + (cardText.get(el) ?? 0) >= len / 3
    : linkTextLength(el, nested) >= len / 2
  const left = (el: HTMLElement, len: number) => len - (listText.get(el) ?? 0)
  // A block in a list is a card or part of one (a long one: We Work Remotely's
  // list the countries a job is open to). A block that isn't rendered is read
  // as its source text, by Chrome and by linkedom alike: a posting under a
  // "Read more" toggle, which is read, or a hidden panel or mobile copy of the
  // cards, which isn't.
  let first: HTMLElement | undefined
  const block = Array.from(document.querySelectorAll<HTMLElement>('div, section, article'))
    .map((el) => ({ el, len: el.innerText?.trim().length ?? 0 }))
    .filter(({ len }) => len > 500 && len < 20000)
    .sort((a, b) => b.len - a.len)
    .find(({ el, len }) => {
      if (isList(el, len)) return false
      first ??= el
      return !hasAncestorIn(el, lists) && !hasAncestorIn(el, hiddenLists) && !(holdsHidden.has(el) && !rendered(el))
        && (doubtful || left(el, len) >= 200)
    })?.el
  if (!block) return doubtful ? undefined : first?.innerText.trim()
  let text = block.innerText.trim()
  let largestList = 0
  for (const [list, { text: cut, plain }] of lists) {
    largestList = Math.max(largestList, plain)
    if (block.contains(list)) text = text.replace(cut, '')
  }
  if (doubtful && text.length <= largestList) return
  return text.replace(/\n{3,}/g, '\n\n').trim()
}

// Repeated cards: an element whose children are mostly (two thirds or more)
// cards of one shape, at least three: the same block tag, class and child tags,
// a line beside the link (a table row's cells, or two child elements), the
// first link outside a paragraph or bullet, each with different text; no child
// holds half the list's text (a posting beside a few cards). Text, not the
// link, tells cards apart: the snapshot the server reads drops each link's
// query and fragment (/careers?gh_jid=1). A job list, whatever plain text each
// card carries, but also some of a site's menus; not a menu of bare links, nor
// paragraphs with a link each (a posting's EEO notes), a requirements list
// that links its tools, or a posting's sections that link from their text.
// Lists that aren't rendered are returned apart: Chrome reads their source
// text (innerText falls back to textContent), and the blocks around them leave
// it out. The outermost lists only, each with its text and how much of it is
// outside links. Each element's first link is found in one pass over the
// links; each child is looked at once, with a walk from its first link up to
// it; a candidate list's text is read once per level it's nested in.
function cardLists(nested: Set<Element>): [Map<HTMLElement, { text: string, plain: number }>, Set<Element>] {
  const firstLink = new Map<Element, Element>()
  for (const a of Array.from(document.querySelectorAll('a[href]'))) {
    for (let el: Element | null = a; el && !firstLink.has(el); el = el.parentElement) firstLink.set(el, a)
  }
  const inText = (link: Element, card: Element) => {
    for (let el = link.parentElement; el && el !== card; el = el.parentElement) if (el.tagName === 'P' || el.tagName === 'LI' || prose(el)) return true
    return false
  }
  const lists = new Set<Element>()
  const seen = new Set<Element>()
  for (const child of firstLink.keys()) {
    const parent = child.parentElement
    if (!parent || seen.has(parent)) continue
    seen.add(parent)
    const shapes = new Map<string, Element[]>()
    for (const kid of Array.from(parent.children)) {
      const link = firstLink.get(kid)
      if (!link || !CARD_TAGS.has(kid.tagName) || (kid.tagName !== 'TR' && kid.children.length < 2) || inText(link, kid) || prose(kid)) continue
      const shape = `${kid.tagName} ${kid.getAttribute('class') ?? ''} ${Array.from(kid.children, (c) => c.tagName).join()}`
      const cards = shapes.get(shape) ?? []
      cards.push(kid)
      shapes.set(shape, cards)
    }
    const mostly = (n: number) => n >= 3 && n * 3 >= parent.children.length * 2
    const isList = (cards: Element[]) => {
      if (!mostly(cards.length)) return false
      const total = parent.textContent?.length ?? 0
      if (Array.from(parent.children).some((kid) => (kid.textContent?.length ?? 0) * 2 >= total)) return false
      return mostly(new Set(cards.map((card) => card.textContent)).size)
    }
    if (Array.from(shapes.values()).some(isList)) lists.add(parent)
  }
  const outermost = new Map<HTMLElement, { text: string, plain: number }>()
  const hidden = new Set<Element>()
  for (const list of lists) {
    const el = list as HTMLElement
    if (hasAncestorIn(el, lists)) continue
    if (!rendered(el)) {
      hidden.add(el)
      continue
    }
    const text = el.innerText?.trim() ?? ''
    outermost.set(el, { text, plain: text.length - linkTextLength(el, nested) })
  }
  return [outermost, hidden]
}

// Text straight in the card or around its link, as a sentence around a link
// has; a card's lines are elements of their own
const prose = (el: Element) => Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent?.trim())
const CARD_TAGS = new Set(['LI', 'DIV', 'ARTICLE', 'SECTION', 'TR'])

// Chrome knows from layout, though it counts a display: contents wrapper
// (SvelteKit's app root) as not rendered: its parent answers instead. linkedom
// has none, so its innerText's markup rules (hidden, inline display:none) are
// checked up the tree.
function rendered(el: HTMLElement): boolean {
  if (typeof el.checkVisibility === 'function') {
    if (el.checkVisibility()) return true
    return getComputedStyle(el).display === 'contents' && !!el.parentElement && rendered(el.parentElement)
  }
  for (let e: Element | null = el; e; e = e.parentElement) {
    if (e.hasAttribute('hidden') || /display\s*:\s*none/i.test(e.getAttribute('style') ?? '')) return false
  }
  return true
}

function hasAncestorIn(el: Element, set: { has(el: Element): boolean }): boolean {
  for (let p = el.parentElement; p; p = p.parentElement) if (set.has(p)) return true
  return false
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
  return /^(?:key |main |your |the )?(?:responsibilities|duties|requirements|qualifications|overview|summary|benefits|(?:job )?(?:description|details)|about(?: us| the (?:role|job|team|company|position))?|join (?:our|the) (?:\S+ )?team|what you.ll do|who we are)[.:!]?$/i.test(text)
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

