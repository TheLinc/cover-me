import { isSupportedHost } from './scrapers/index.ts'

// The employer's logo for the posting card (#346), in the order that's surest
// to be the employer's own: the posting data, then a board's employer logo,
// then the site's icon on the employer's own careers site. Kept out of the
// scrapers so the server copy (scripts/sync-scrapers.mjs) doesn't change.
export function postingLogo(company: string): string | undefined {
  return https(dataLogo()) ?? https(boardLogo()) ?? https(ownSiteIcon(company))
}

function dataLogo(): string | undefined {
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    let data: unknown
    try {
      data = JSON.parse(script.textContent ?? '')
    } catch {
      continue
    }
    for (const node of flatten(data)) {
      if (![node['@type']].flat().includes('JobPosting')) continue
      const logo = (node.hiringOrganization as { logo?: string | { url?: unknown; contentUrl?: unknown } } | undefined)?.logo
      const url = typeof logo === 'string' ? logo : logo?.url ?? logo?.contentUrl
      if (typeof url === 'string') return url
    }
  }
  return document.querySelector('[itemtype*="schema.org/JobPosting"] [itemprop="hiringOrganization"] [itemprop="logo"]')?.getAttribute('content') ?? undefined
}

function flatten(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data.flatMap(flatten)
  if (!data || typeof data !== 'object') return []
  const obj = data as Record<string, unknown>
  return [obj, ...flatten(obj['@graph'])]
}

// Most boards' share image is their own or the job's; these two hold the employer's uploaded logo (#346).
function boardLogo(): string | undefined {
  const image = document.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? ''
  if (location.hostname.endsWith('greenhouse.io') && image.includes('/external_greenhouse_job_boards/logos/')) return image
  if (location.hostname.endsWith('myworkdayjobs.com') && /\/assets\/logo$/.test(image)) return image
  return undefined
}

// A site's icon is the employer's logo only on the employer's own site, so the
// site's name (apple in jobs.apple.com) has to start with the company's first word (#346).
// ponytail: a two-part suffix (fernbrook.co.uk) reads as "co" and gets no icon.
function ownSiteIcon(company: string): string | undefined {
  if (isSupportedHost(location.hostname)) return undefined
  const word = company.toLowerCase().split(/[^a-z0-9]+/).find((w) => w && w !== 'the')
  const labels = location.hostname.split('.')
  const site = (labels[labels.length - 2] ?? '').replace(/[^a-z0-9]/g, '')
  if (!word || word.length < 2 || !site.startsWith(word)) return undefined
  const href = (document.querySelector('link[rel~="apple-touch-icon"]') ?? document.querySelector('link[rel~="icon"]'))?.getAttribute('href')
  return href ?? undefined
}

function https(url: string | undefined): string | undefined {
  if (!url || !URL.canParse(url, location.href)) return undefined
  const resolved = new URL(url, location.href)
  return resolved.protocol === 'https:' ? resolved.href : undefined
}
