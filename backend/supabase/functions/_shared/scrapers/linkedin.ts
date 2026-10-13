import type { JobData } from './types.ts'
import { jobFromJsonLd } from './jsonld.ts'

// ── Utilities ─────────────────────────────────────────────────────────────────

// An ancestor walk, not closest(): linkedom compiles the selector on every call,
// and the title walk asks this for every candidate.
const CHROME_TAGS = new Set(['NAV', 'HEADER', 'FOOTER'])
const CHROME_ROLES = new Set(['navigation', 'banner', 'complementary'])
function isUIChrome(el: HTMLElement): boolean {
  for (let x: Element | null = el; x; x = x.parentElement) {
    if (CHROME_TAGS.has(x.tagName) || CHROME_ROLES.has(x.getAttribute('role') ?? '')) return true
  }
  return false
}

// ── Shadow DOM traversal ──────────────────────────────────────────────────────
// LinkedIn's new "interop" shell renders page content inside open shadow roots
// (declarative <template shadowrootmode="open"> on #interop-outlet), which
// querySelector never pierces. These helpers extend queries through every open
// shadow root in the current document.

function collectShadowRoots(root: ParentNode, acc: ShadowRoot[] = []): ShadowRoot[] {
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('*'))) {
    if (el.shadowRoot) {
      acc.push(el.shadowRoot)
      collectShadowRoots(el.shadowRoot, acc)
    }
  }
  return acc
}

function queryDeep<T extends Element>(selector: string): T | null {
  const direct = document.querySelector<T>(selector)
  if (direct) return direct
  for (const sr of collectShadowRoots(document)) {
    const found = sr.querySelector<T>(selector)
    if (found) return found
  }
  return null
}

// parentElement that can climb out of a shadow root into its host element
function parentOrHost(el: HTMLElement): HTMLElement | null {
  if (el.parentElement) return el.parentElement
  const root = el.getRootNode()
  return root instanceof ShadowRoot && root.host instanceof HTMLElement ? root.host : null
}

function isValidJobTitle(text: string): boolean {
  if (!text || text.length < 4 || text.length > 120) return false
  if (/^\d|^[•·]/.test(text)) return false
  const lower = text.toLowerCase()
  const reject = [
    'notification', 'message', 'connection', 'invitation',
    'sign in', 'log in', 'people you can', 'reach out',
    'put your best', 'job alert', 'about the', 'company photo',
    'more jobs', 'skip to', 'job poster', 'verified job',
    'hiring team', 'meet the', 'show all', 'follow',
    'reposted', 'week ago', 'day ago', 'hour ago', 'month ago', 'just now',
    'people clicked', 'clicked apply', 'applicants', 'promoted',
    // "Application status" once you've applied (not plain "application":
    // "Application Developer" is a title)
    'application status', 'see application', 'applied on company site', 'go to company site',
  ]
  return !reject.some(p => lower.includes(p))
}

// ── Strategy 1: Current LinkedIn layout (confirmed via DOM inspection) ─────────
//
// From actual HTML:
//   Title:       <p>Job Title<span> </span><a>badge</a></p>
//   Company:     <a href="https://www.linkedin.com/company/name/life/">Company</a>
//   Description: <span data-testid="expandable-text-box">...</span>
//
// data-testid and href URL patterns are far more stable than obfuscated class names.

function tryCurrentLayout(): JobData | null {
  // Description — data-testid is stable across redesigns
  const descEl = queryDeep<HTMLElement>('[data-testid="expandable-text-box"]')
  const description = descEl && readDescription(descEl)
  if (!descEl || !description) return null

  const company = findCompanyNearDescription(descEl) ?? 'Unknown Company'

  // Title — the title <p> contains the job title as its first text node,
  // followed by child elements (badge icons, verified checkmarks).
  // Reading innerText would include badge aria-labels, so we read text nodes only.
  const title = findTitleBeforeDescription(descEl)

  return {
    title: title ?? 'Job Application',
    company,
    description,
    url: window.location.href,
  }
}

// The box holds only the posting's opening paragraphs. It's a <span> in a <p>,
// and LinkedIn sends the page as HTML, where a list can't sit inside a <p>: the
// parser closes the <p> at the first list, and the rest of the posting follows
// it as siblings (lists, headings, text), up to the "… more" button. After that
// come a divider and "Benefits found in job post", which aren't the posting.
// The container's innerText keeps the spacing between those pieces, so the
// posting is cut out of it: from the box's opening text to the first text at or
// after the button (or divider). A posting with no list keeps the button inside
// the box, so a trailing "… more" is dropped either way.
// String checks, not a regex: the server runs this on text anyone can send, and
// /\s*(…|\.\.\.)\s*more$/ backtracks quadratically over long whitespace runs.
function dropMore(s: string): string {
  const t = s.trim()
  if (t.slice(-4).toLowerCase() !== 'more') return t
  const u = t.slice(0, -4).trimEnd()
  if (u.endsWith('…')) return u.slice(0, -1).trimEnd()
  if (u.endsWith('...')) return u.slice(0, -3).trimEnd()
  return t
}

// The elements that make up the posting: the box alone, or the box's <p> and
// the siblings after it, up to the button or divider. Tag and attribute checks,
// not matches(): linkedom compiles the selector on every call, per sibling.
const isPostingEnd = (el: Element) => el.tagName === 'HR' || el.getAttribute('data-testid') === 'expandable-text-button'
function postingParts(descEl: HTMLElement): Element[] {
  const p = descEl.parentElement
  if (p?.tagName !== 'P' || !p.parentElement) return [descEl]
  const parts: Element[] = []
  for (let el: Element | null = p; el && !isPostingEnd(el); el = el.nextElementSibling) parts.push(el)
  return parts
}

// Hidden in the markup, the way the server's innerText decides (page.ts): such
// an element's text isn't in its container's innerText, so it can't end it.
const hiddenInMarkup = (el: Element) => el.hasAttribute('hidden') || /display\s*:\s*none/i.test(el.getAttribute('style') ?? '')

function readDescription(descEl: HTMLElement): string {
  const box = dropMore(descEl.innerText ?? '')
  const parts = postingParts(descEl)
  const container = parts[0] === descEl ? null : parts[0].parentElement
  if (!container || !box) return box
  const all = container.innerText ?? ''
  // From the first copy of the box's opening: a short box that repeats the
  // heading above it ("Responsibilities") starts at the heading, so that text
  // shows twice. Accepted: nothing is lost, and skipping the text before the
  // box can't be measured exactly (hidden siblings), which risked cutting the
  // posting's start.
  const start = all.indexOf(box.slice(0, 80))
  if (start === -1) return box
  let end = all.length
  // The end marker is the button, or once the posting is expanded (button
  // hidden, so a miss) the "Benefits found in job post" line two siblings on.
  // Each search costs text x marker, so: at most 3 markers with text, 20
  // characters each, over at most 10 siblings; siblings hidden in the markup
  // are skipped without a search. lastIndexOf, not a forward search, so marker
  // text inside the posting can't end it early, and a match only counts after
  // the box. (A 20-character prefix can match later text that shares it; the
  // real markers, "… more" and "Benefits found in job post", don't.)
  let searches = 0
  let seen = 0
  for (let el = parts[parts.length - 1].nextElementSibling; el && seen++ < 10 && searches < 3; el = el.nextElementSibling) {
    if (hiddenInMarkup(el)) continue
    const first = (el as HTMLElement).innerText?.trim().split('\n')[0].slice(0, 20)
    if (!first) continue
    searches++
    const at = all.lastIndexOf(first)
    if (at >= start + box.length) { end = at; break }
  }
  // <br><br> next to a list stacks blank lines
  return dropMore(all.slice(start, end).replace(/\n{3,}/g, '\n\n'))
}

// Company — LinkedIn company profile URLs always contain /company/. Search
// outward from the description element so that on split-pane pages (search
// results, collections) we find the detail pane's company link rather than the
// first job-list card's. Only links above the description count: the "About
// the company" card below it links the company too, with "12,345 followers"
// inside the link. The top card's first company link wraps only the logo, so
// skip links with no text (and the card's "Show more"). When the only named
// link is that card (a top card with the name as plain text), its first line
// still beats the logo link. Once the card is known, a link above only counts
// if it's the same company: on a split pane the walk reaches the job list,
// whose cards link their own companies.
const COMPANY_LINK = 'a[href*="linkedin.com/company/"]'
const linkText = (a: HTMLElement) => {
  const text = a.innerText?.trim().split('\n')[0].trim()
  return text && !/^show (more|all)\b/i.test(text) ? text : undefined
}
const companySlug = (a: Element) => a.getAttribute('href')?.match(/\/company\/([^/?#]+)/)?.[1]

function findCompanyNearDescription(descEl: HTMLElement): string | undefined {
  // Links in the posting itself ("backed by Globex") aren't the employer
  const posting = new Set<Element>(postingParts(descEl))
  // Each level's container holds the previous one's links: judge each link once
  // (its text read once), so a page full of links costs links, not links x levels.
  const seen = new Set<Element>()
  // In the posting, or inside a link already judged (linkedom lets <a> nest,
  // and reading every nested link's text would cost links x subtree)
  const skip = (a: Element) => {
    if (posting.has(a)) return true
    for (let x = a.parentElement; x; x = x.parentElement) if (posting.has(x) || seen.has(x)) return true
    return false
  }
  let container: HTMLElement | null = parentOrHost(descEl)
  let depth = 0
  let below: { text: string; slug?: string } | undefined
  while (container && depth < 16) {
    for (const a of Array.from(container.querySelectorAll<HTMLElement>(COMPANY_LINK))) {
      if (seen.has(a)) continue
      const skipped = skip(a)
      seen.add(a)
      if (skipped) continue
      const text = linkText(a)
      if (!text) continue
      // A link in another tree (light DOM vs the shadow root holding the
      // description) is never "above": Chrome sets FOLLOWING or PRECEDING at
      // random there, and the server sets neither
      const pos = a.compareDocumentPosition(descEl)
      if (!(pos & Node.DOCUMENT_POSITION_DISCONNECTED) && pos & Node.DOCUMENT_POSITION_FOLLOWING) {
        if (!below || companySlug(a) === below.slug) return text
        continue
      }
      below ??= { text, slug: companySlug(a) }
    }
    container = parentOrHost(container)
    depth++
  }
  if (below) return below.text
  // The first named one: a logo-only link comes first on most pages. Links
  // nested in one already read are skipped, as in the walk above.
  const read = new Set<Element>()
  for (const root of [document, ...collectShadowRoots(document)]) {
    for (const a of Array.from(root.querySelectorAll<HTMLElement>(COMPANY_LINK))) {
      let nested = false
      for (let x = a.parentElement; x && !nested; x = x.parentElement) nested = read.has(x)
      read.add(a)
      if (nested) continue
      const text = linkText(a)
      if (text) return text
    }
  }
  return undefined
}

// Extract text from direct text nodes only — ignores child element text
function firstTextNode(el: HTMLElement): string {
  return Array.from(el.childNodes)
    .filter(n => n.nodeType === Node.TEXT_NODE)
    .map(n => n.textContent?.trim() ?? '')
    .filter(Boolean)
    .join(' ')
    .trim()
}

// Extract a clean job title from a LinkedIn title <p> element.
// LinkedIn uses two different structures depending on the page layout:
//
//   Full job page:      <p>Title text<span>badge</span></p>
//   Search results:     <p>
//                         <span>Selected, Title (Verified job)</span>   ← screen reader
//                         <span aria-hidden="true">Title<span>badge</span></span>  ← visual
//                       </p>
//
// We try direct text node first (full page), then the visual aria-hidden span (search).
function extractTitleFromP(p: HTMLElement): string | undefined {
  // Case 1: direct text node (full job page)
  const direct = firstTextNode(p)
  if (direct.length >= 8 && isValidJobTitle(direct)) return direct

  // Direct children by tag, not `:scope > …` selectors: linkedom scans the
  // whole subtree for those, and nested candidates would cost depth x page.
  const kids = Array.from(p.children) as HTMLElement[]
  // A title is never a block or long. The full-text read is skipped for an
  // element holding a block (linkedom nests <p>, so each nested candidate
  // would read everything below it), and text over 200 characters is dropped
  // before the regexes, which backtrack on long whitespace runs.
  const textOf = (el: HTMLElement) => {
    const t = firstTextNode(el) || (el.querySelector('p, div') ? '' : el.innerText?.trim() ?? '')
    return t.length > 200 ? '' : t
  }

  // Case 2: visual span with aria-hidden="true" (search results split-pane)
  const visualSpan = kids.find((k) => k.tagName === 'SPAN' && k.getAttribute('aria-hidden') === 'true')
  if (visualSpan) {
    const text = firstTextNode(visualSpan)
    if (text.length >= 8 && isValidJobTitle(text)) return text
  }

  // Case 3: any direct child span — strip LinkedIn's "Selected, " prefix and
  // "(Verified job)" suffix that appear in the screen-reader span
  for (const span of kids.filter((k) => k.tagName === 'SPAN')) {
    const cleaned = textOf(span)
      .replace(/^[A-Za-z\s]{1,20},\s*/i, '') // strip status prefix e.g. "Selected, "
      .replace(/\s*\(verified job\)\s*$/i, '')
      .trim()
    if (cleaned.length >= 8 && isValidJobTitle(cleaned)) return cleaned
  }

  // Case 4: title wrapped in a direct child <a> (LinkedIn search results detail pane
  // renders the job title as <p><a href="/jobs/view/...">Title</a></p>). Only links
  // to a posting: once you've applied, "Application status" adds
  // <p><a href="/safety/go/...">Go to company site</a></p> between the header and
  // the description, closer to it than the real title. (Not currentJobId= links:
  // the snapshot strips query strings, so the server would never see them.)
  for (const a of kids.filter((k) => k.tagName === 'A' && (k.getAttribute('href') ?? '').includes('/jobs/view/'))) {
    const text = textOf(a)
      .replace(/\s*\(verified job\)\s*/gi, '')
      .trim()
    if (text.length >= 4 && isValidJobTitle(text)) return text
  }

  return undefined
}

// Find the job title. Strategy:
//   1. Walk up from descEl and search for [data-display-contents="true"] > p within
//      progressively larger containers — this keeps the search scoped to the detail
//      panel and avoids picking up job-list card titles on the search results page,
//      where document.querySelector would return the first card (wrong job).
//   2. Scan <p> elements near the company link as fallback.
function findTitleBeforeDescription(descEl: HTMLElement | null): string | undefined {
  // Primary: scope to the container holding descEl so we never reach the job list.
  if (descEl) {
    let container: HTMLElement | null = descEl.parentElement
    let depth = 0
    // A candidate's verdict doesn't depend on the level, so judge each once:
    // re-judging at every level costs candidates x 12 on a crafted page.
    const judged = new Set<Element>()
    while (container && container !== document.body && depth < 12) {
      // The title is always the first element in the header — metadata like
      // "Reposted 1 week ago" appears later — so take candidates in order.
      for (const p of Array.from(container.querySelectorAll<HTMLElement>('[data-display-contents="true"] > p'))) {
        if (judged.has(p)) continue
        judged.add(p)
        if (isUIChrome(p)) continue
        // p must precede descEl in the DOM (title is above description); the
        // box's own <p> "precedes" it too, as its parent
        if (p.contains(descEl) || !(p.compareDocumentPosition(descEl) & Node.DOCUMENT_POSITION_FOLLOWING)) continue
        const text = extractTitleFromP(p)
        if (text) return text
      }
      container = parentOrHost(container)
      depth++
    }
  }

  // Fallback: scan <p> elements anchored near the company link, working
  // outward from it so we stay in the job card header area.
  const companyEl = queryDeep<HTMLAnchorElement>('a[href*="linkedin.com/company/"]')
  if (companyEl) {
    let container: HTMLElement | null = companyEl.parentElement
    let depth = 0
    while (container && container !== document.body && depth < 16) {
      const ps = Array.from(container.querySelectorAll<HTMLElement>('p'))
      // Stop before we've walked too far up and risk picking up unrelated sections
      if (depth > 0 && ps.length > 30) break
      for (const p of ps) {
        if (isUIChrome(p)) continue
        if (descEl && (p.contains(descEl) || !(p.compareDocumentPosition(descEl) & Node.DOCUMENT_POSITION_FOLLOWING))) continue
        const text = extractTitleFromP(p)
        if (text) return text
      }
      container = parentOrHost(container)
      depth++
    }
  }

  return undefined
}

// ── Strategy 2: Embedded JSON blobs ───────────────────────────────────────────

function tryEmbeddedJson(): JobData | null {
  for (const code of Array.from(document.querySelectorAll<HTMLElement>('code[id^="bpr-guid"]'))) {
    try {
      const data = JSON.parse(code.innerText) as Record<string, unknown>
      const included = (data.included ?? []) as Record<string, unknown>[]
      for (const item of included) {
        const type = String(item['$type'] ?? item['entityUrn'] ?? '')
        if (!type.toLowerCase().includes('jobposting')) continue
        const title = (item.title ?? item.jobTitle) as string | undefined
        const rawDesc = item.description as Record<string, string> | string | undefined
        const description = typeof rawDesc === 'object' ? rawDesc?.text : rawDesc
        if (title && description) {
          return { title, company: 'Unknown Company', description, url: window.location.href }
        }
      }
    } catch { /* malformed — continue */ }
  }
  return null
}

// ── Strategy 3: Legacy / named CSS selectors ──────────────────────────────────
// LinkedIn used stable class names before their obfuscation rollout.
// Kept as a fast path in case they revert or for older cached pages.

function tryLegacySelectors(): JobData | null {
  const titleSelectors = [
    'h1.top-card-layout__title',
    'h1.jobs-unified-top-card__job-title',
    '.job-details-jobs-unified-top-card__job-title h1',
    'h1.t-24',
    'h1[class*="job-title"]',
  ]
  const descSelectors = [
    '#job-details',
    '.jobs-description__content',
    '.jobs-description-content__text',
    '.jobs-description-content__text--stretch',
    '[class*="description__content"]',
    '[class*="jobs-description"]',
  ]
  const companySelectors = [
    'a.topcard__org-name-link',
    '.jobs-unified-top-card__company-name a',
    '.job-details-jobs-unified-top-card__company-name a',
  ]

  function first(sels: string[]) {
    for (const s of sels) {
      const t = queryDeep<HTMLElement>(s)?.innerText?.trim()
      if (t) return t
    }
  }

  const title = first(titleSelectors)
  const description = first(descSelectors)
  if (!title || !description) return null

  return {
    title,
    company: first(companySelectors) ?? 'Unknown Company',
    description,
    url: window.location.href,
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export function scrapeLinkedIn(): JobData {
  // DOM strategies first: they read the in-focus detail pane. JSON-LD covers
  // the signed-out /jobs/view/ page. The embedded JSON blobs are last-resort
  // only — on search pages they contain every job in the results list, so
  // they can return the wrong posting.
  const result =
    tryCurrentLayout() ??
    tryLegacySelectors() ??
    jobFromJsonLd() ??
    tryEmbeddedJson()

  if (result) return result

  throw new Error(
    'Could not read this LinkedIn job posting. ' +
    'Try opening the job in its own page (linkedin.com/jobs/view/…) and generating again.',
  )
}
