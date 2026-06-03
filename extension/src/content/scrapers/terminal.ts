import type { JobData } from '../../types'

export function scrapeTerminal(): JobData {
  // Strategy 1: JSON-LD structured data (cleanest if available)
  const ldJob = tryJsonLd()
  if (ldJob) return ldJob

  // Strategy 2: anchor on "About The Role" heading, then extract sibling content
  const description = tryAboutSection()

  // Strategy 3: find job title — any h1/h2/h3 that isn't a nav phrase
  const titleEl = Array.from(document.querySelectorAll<HTMLElement>('h1, h2, h3')).find(
    (el) => {
      const t = el.innerText?.trim()
      return t && t.length > 2 && t.length < 120 && !isNav(t)
    },
  )
  const title = titleEl?.innerText?.trim()

  // Strategy 4: company — look at text nodes near/above the title element
  const company = title ? findNearCompany(titleEl!) : undefined

  if (!title || !description || description.length < 100) {
    throw new Error(
      'Click a job in the left panel to load it, then click Generate.',
    )
  }

  return {
    title,
    company: company ?? 'Unknown Company',
    description,
    url: window.location.href,
  }
}

function tryJsonLd(): JobData | null {
  for (const script of document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(script.textContent ?? '') as Record<string, unknown>
      if (data['@type'] === 'JobPosting') {
        const title = (data.title ?? data.name) as string | undefined
        const org = data.hiringOrganization as Record<string, string> | string | undefined
        const company = typeof org === 'object' ? org.name : (org ?? 'Unknown Company')
        const description = stripHtml((data.description as string | undefined) ?? '')
        if (title && description) return { title, company, description, url: window.location.href }
      }
    } catch { /* malformed — skip */ }
  }
  return null
}

function tryAboutSection(): string {
  // Find any heading-like element whose text is a known "about" phrase
  const aboutHeadings = ['about the role', 'about this role', 'the role',
    'about the position', 'job description', 'about the job']

  const allEls = document.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,p,span,div')
  for (const el of allEls) {
    const t = el.innerText?.trim().toLowerCase()
    if (!aboutHeadings.includes(t)) continue

    // Walk up to find a section/article/div container, then grab the text after the heading
    const container = el.closest<HTMLElement>('section, article, [class*="about"], [class*="description"], [class*="detail"]')
      ?? el.parentElement

    if (!container) continue

    // Get all the text from the container, skipping the heading line itself
    const raw = container.innerText?.trim() ?? ''
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
    // Drop lines that match the heading
    const afterHeading = lines.filter(l => !aboutHeadings.includes(l.toLowerCase()))
    const text = afterHeading.join('\n')
    if (text.length > 100) return text
  }
  return ''
}

function findNearCompany(titleEl: HTMLElement): string | undefined {
  // Check parent and siblings of the title element for a short text that looks like a company name
  const candidates: HTMLElement[] = []

  let el: HTMLElement | null = titleEl.parentElement
  for (let i = 0; i < 5 && el; i++) {
    candidates.push(...Array.from(el.querySelectorAll<HTMLElement>('p, span, a, h1, h2, h3, h4')))
    el = el.parentElement
  }

  return candidates
    .map(c => c.innerText?.trim())
    .find(t => t && t.length > 1 && t.length < 60 && t !== titleEl.innerText?.trim() && !isNav(t))
}

function isNav(text: string): boolean {
  const lower = text.toLowerCase()
  return ['browse jobs', 'job matches', 'search results', 'find jobs', 'open roles',
    'all jobs', 'job listings', 'about the role', 'about this role', 'job description',
    'the role', 'about the job'].some(p => lower === p || lower.startsWith(p + '\n'))
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}
