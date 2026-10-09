import type { JobData } from './types.ts'

// schema.org JobPosting from the page's JSON-LD (microdata further down). Most boards (Lever, Ashby,
// Workable, BambooHR, LinkedIn's signed-out page) embed one, and it names the
// company exactly where the DOM often doesn't.
export function jobFromJsonLd(): JobData | null {
  for (const script of document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]')) {
    let data: unknown
    try {
      data = JSON.parse(script.textContent ?? '')
    } catch {
      continue // malformed JSON-LD — try the next block
    }
    for (const node of flatten(data)) {
      const types = [node['@type']].flat()
      if (!types.includes('JobPosting')) continue
      const title = htmlToText(String(node.title ?? node.name ?? ''))
      const org = node.hiringOrganization as { name?: unknown } | string | undefined
      const company = htmlToText(String((typeof org === 'object' ? org?.name : org) ?? '')) || 'Unknown Company'
      const description = htmlToText(String(node.description ?? ''))
      if (title && description.length > 100) return { title, company, description, url: window.location.href }
    }
  }
  return null
}

// schema.org JobPosting as microdata (itemprop attributes), which some boards
// use instead of JSON-LD (SmartRecruiters). Values sit in an element's text
// or, for <meta>, its content attribute.
const MICRODATA_SECTIONS = ['description', 'responsibilities', 'qualifications', 'skills',
  'experienceRequirements', 'educationRequirements', 'incentives', 'jobBenefits']

export function jobFromMicrodata(): JobData | null {
  const posting = document.querySelector<HTMLElement>('[itemscope][itemtype*="schema.org/JobPosting"]')
  if (!posting) return null
  const value = (el: Element | null | undefined) =>
    (el?.getAttribute('content') ?? (el as HTMLElement | null)?.innerText ?? '').trim()
  const title = value(posting.querySelector('[itemprop="title"]'))
  const org = posting.querySelector('[itemprop="hiringOrganization"]')
  const company = value(org?.querySelector('[itemprop="name"]')) || value(org) || 'Unknown Company'
  // Outermost sections only: some boards nest responsibilities inside description.
  const sections = Array.from(posting.querySelectorAll<HTMLElement>(MICRODATA_SECTIONS.map((p) => `[itemprop="${p}"]`).join(',')))
  const description = sections
    .filter((el) => !sections.some((other) => other !== el && other.contains(el)))
    .map((el) => el.innerText.trim())
    .filter(Boolean)
    .join('\n\n')
  if (!title || description.length < 100) return null
  return { title, company, description, url: window.location.href }
}

// A block can be one object, an array, or an @graph of objects.
function flatten(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data.flatMap(flatten)
  if (!data || typeof data !== 'object') return []
  const obj = data as Record<string, unknown>
  return [obj, ...flatten(obj['@graph'])]
}

// JSON-LD descriptions are HTML. Keep paragraph and list breaks so the model
// sees the posting's structure, and decode entities (&amp;, &nbsp;).
export function htmlToText(html: string): string {
  // LinkedIn encodes the HTML itself: &lt;strong&gt;…
  if (!html.includes('<') && html.includes('&lt;')) html = decodeEntities(html)
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/(p|div|ul|ol|h[1-6]|tr|section)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
  return decodeEntities(text)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Called only on text whose tags are already stripped (or still entity-encoded),
// so parsing just decodes entities. A DOMParser document is inert: nothing in
// it runs or loads.
function decodeEntities(s: string): string {
  return new DOMParser().parseFromString(`<!doctype html><html><body>${s}</body></html>`, 'text/html').body?.textContent ?? ''
}
