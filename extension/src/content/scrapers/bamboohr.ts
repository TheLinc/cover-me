import type { JobData } from '../../types'

export function scrapeBambooHR(): JobData {
  // BambooHR inlines a full JobPosting JSON-LD block — most reliable path
  const fromLd = tryJsonLd()
  if (fromLd) return fromLd

  // Fallback: BambooHR Fabric component selectors (stable data-fabric-component attributes)
  const title = document.querySelector<HTMLElement>(
    '[data-fabric-component="Headline"]',
  )?.innerText?.trim()

  const description = document.querySelector<HTMLElement>('.BambooRichText')?.innerText?.trim()

  // Company from subdomain as last resort (e.g. pictonmahoney → Picton Mahoney)
  const subdomain = window.location.hostname.split('.')[0]
  const company = subdomain
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')

  if (!title || !description || description.length < 200) {
    throw new Error(
      'Could not find job details on this BambooHR page. Try refreshing the page, or paste the job description manually.',
    )
  }

  return { title, company, description, url: window.location.href }
}

function tryJsonLd(): JobData | null {
  const scripts = document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]')
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent ?? '') as Record<string, unknown>
      if (data['@type'] === 'JobPosting') {
        const title = String(data.title ?? data.name ?? '').trim()
        const org = data.hiringOrganization as Record<string, unknown> | string | undefined
        const company = typeof org === 'object'
          ? String(org?.name ?? 'Unknown Company')
          : String(org ?? 'Unknown Company')
        const description = String(data.description ?? '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        if (title && description.length > 100) {
          return { title, company, description, url: window.location.href }
        }
      }
    } catch {
      // malformed JSON-LD — try next
    }
  }
  return null
}
