import type { JobData } from '../../types'

// ── Utilities ─────────────────────────────────────────────────────────────────

function isUIChrome(el: HTMLElement): boolean {
  return !!el.closest('nav, header, footer, [role="navigation"], [role="banner"], [role="complementary"]')
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
  const descEl = document.querySelector<HTMLElement>('[data-testid="expandable-text-box"]')
  const description = descEl?.innerText?.trim()
  if (!description) return null

  // Company — LinkedIn company profile URLs always contain /company/
  const companyEl = document.querySelector<HTMLAnchorElement>('a[href*="linkedin.com/company/"]')
  const company = companyEl?.innerText?.trim() || 'Unknown Company'

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

  // Case 2: visual span with aria-hidden="true" (search results split-pane)
  const visualSpan = p.querySelector<HTMLElement>(':scope > span[aria-hidden="true"]')
  if (visualSpan) {
    const text = firstTextNode(visualSpan)
    if (text.length >= 8 && isValidJobTitle(text)) return text
  }

  // Case 3: any direct child span — strip LinkedIn's "Selected, " prefix and
  // "(Verified job)" suffix that appear in the screen-reader span
  for (const span of Array.from(p.querySelectorAll<HTMLElement>(':scope > span'))) {
    const raw = (firstTextNode(span) || span.innerText?.trim() || '')
    const cleaned = raw
      .replace(/^[A-Za-z\s]{1,20},\s*/i, '') // strip status prefix e.g. "Selected, "
      .replace(/\s*\(verified job\)\s*$/i, '')
      .trim()
    if (cleaned.length >= 8 && isValidJobTitle(cleaned)) return cleaned
  }

  // Case 4: title wrapped in a direct child <a> (LinkedIn search results detail pane
  // renders the job title as <p><a href="/jobs/view/...">Title</a></p>)
  for (const a of Array.from(p.querySelectorAll<HTMLAnchorElement>(':scope > a'))) {
    const text = (firstTextNode(a) || a.innerText?.trim() || '')
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
    while (container && container !== document.body && depth < 12) {
      const candidates = Array.from(
        container.querySelectorAll<HTMLElement>('[data-display-contents="true"] > p')
      ).filter(p =>
        !isUIChrome(p) &&
        // p must precede descEl in the DOM (title is above description)
        !!(p.compareDocumentPosition(descEl) & Node.DOCUMENT_POSITION_FOLLOWING)
      )
      if (candidates.length > 0) {
        // The title is always the first element in the header — metadata like
        // "Reposted 1 week ago" appears later and would be candidates[last].
        for (const p of candidates) {
          const text = extractTitleFromP(p)
          if (text) return text
        }
      }
      container = container.parentElement
      depth++
    }
  }

  // Fallback: scan <p> elements anchored near the company link, working
  // outward from it so we stay in the job card header area.
  const companyEl = document.querySelector<HTMLAnchorElement>('a[href*="linkedin.com/company/"]')
  if (companyEl) {
    let container: HTMLElement | null = companyEl.parentElement
    while (container && container !== document.body) {
      for (const p of Array.from(container.querySelectorAll<HTMLElement>('p'))) {
        if (isUIChrome(p)) continue
        if (descEl && !(p.compareDocumentPosition(descEl) & Node.DOCUMENT_POSITION_FOLLOWING)) continue
        const text = extractTitleFromP(p)
        if (text) return text
      }
      container = container.parentElement
      // Stop before we've walked too far up and risk picking up unrelated sections
      if (container && container.querySelectorAll('p').length > 30) break
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
      const t = document.querySelector<HTMLElement>(s)?.innerText?.trim()
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
  const result =
    tryEmbeddedJson() ??
    tryCurrentLayout() ??
    tryLegacySelectors()

  if (result) return result

  throw new Error(
    'Could not read this LinkedIn job posting. ' +
    'Try opening the job in its own page (linkedin.com/jobs/view/…) and generating again.',
  )
}
