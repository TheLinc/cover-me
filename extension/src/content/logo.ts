import { isSupportedHost } from './scrapers/index.ts'

// Surest to be the employer's own first. Kept out of the scrapers so their
// server copy (scripts/sync-scrapers.mjs) doesn't change (#346).
export function postingLogo(company: string): string | undefined {
  return dataLogo(company) ?? https(boardLogo(company)) ?? https(ownSiteIcon(company))
}

function dataLogo(company: string): string | undefined {
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    let data: unknown
    try {
      data = JSON.parse(script.textContent ?? '')
    } catch {
      continue
    }
    for (const node of flatten(data)) {
      if (![node['@type']].flat().includes('JobPosting')) continue
      const org = node.hiringOrganization as { name?: unknown; logo?: string | { url?: unknown; contentUrl?: unknown } } | undefined
      if (typeof org?.name === 'string' && !sameCompany(org.name, company)) continue
      const logo = org?.logo
      const ref = typeof logo === 'string' ? logo : logo?.url ?? logo?.contentUrl
      const url = typeof ref === 'string' ? https(ref) : undefined
      if (url) return url
    }
  }
  const el = document.querySelector('[itemtype*="schema.org/JobPosting"] [itemprop="hiringOrganization"] [itemprop="logo"]')
  return https(el?.getAttribute('content') ?? el?.getAttribute('src') ?? el?.getAttribute('href') ?? undefined)
}

// Another posting on the page (a related-jobs block) is another company's; a
// legal suffix ("Fernbrook Analytics, Inc.") is the same one (#346).
function sameCompany(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const [x, y] = [norm(a), norm(b)]
  return !x || !y || x.startsWith(y) || y.startsWith(x)
}

function flatten(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data.flatMap(flatten)
  if (!data || typeof data !== 'object') return []
  const obj = data as Record<string, unknown>
  return [obj, ...flatten(obj['@graph'])]
}

// Most boards' share image is their own or the job's; Greenhouse's and Workday's
// hold the employer's upload. Signed-in LinkedIn has no posting data, and its
// page shows related jobs' logos too, so only the one named for the company (#346).
function boardLogo(company: string): string | undefined {
  if (location.hostname.endsWith('linkedin.com')) {
    const name = company.toLowerCase()
    return Array.from(document.querySelectorAll('img[src*="/company-logo_"]'))
      .find((img) => name && (img.getAttribute('alt') ?? '').toLowerCase().includes(name))?.getAttribute('src') ?? undefined
  }
  const image = document.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? ''
  if (location.hostname.endsWith('greenhouse.io') && image.includes('/external_greenhouse_job_boards/logos/')) return image
  if (location.hostname.endsWith('myworkdayjobs.com') && /\/assets\/logo$/.test(image)) return image
  return undefined
}

// A site's icon is the employer's logo only on the employer's own site, so the
// site's name has to be the company's (apple in jobs.apple.com, metacareers),
// not merely start like it (Glass Lewis on glassdoor.com) (#346).
// ponytail: a two-part suffix (fernbrook.co.uk) reads as "co" and gets no icon.
function ownSiteIcon(company: string): string | undefined {
  if (isSupportedHost(location.hostname)) return undefined
  const words = company.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  if (words[0] === 'the') words.shift()
  const labels = location.hostname.split('.')
  const site = (labels[labels.length - 2] ?? '').replace(/[^a-z0-9]/g, '')
  const names = [words[0], words.join('')].filter((n) => n && n.length >= 2)
  if (!names.some((n) => site === n || site === n + 'careers' || site === n + 'jobs')) return undefined
  const href = (document.querySelector('link[rel~="apple-touch-icon"]') ?? document.querySelector('link[rel~="icon"]'))?.getAttribute('href')
  return href ?? undefined
}

function https(url: string | undefined): string | undefined {
  if (!url || url.length > 2048 || !URL.canParse(url, location.href)) return undefined
  const resolved = new URL(url, location.href)
  return resolved.protocol === 'https:' ? resolved.href : undefined
}
