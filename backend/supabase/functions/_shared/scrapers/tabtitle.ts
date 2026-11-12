// Career sites that don't name the employer in the posting usually do in the
// tab title: "<job> | Amazon.jobs", "<job> - Jobs - Careers at Apple",
// "<job> — Google Careers", "<job> @ Riveron", "RAMON.SPACE - <job>" (#200).
// The snapshot sent to the scrape function drops <meta>, so og:site_name isn't
// there to read; the title is.

const SEPARATOR = /\s+(?:[|@·•–—-]|at)\s+/
// "Google Careers", "Amazon.jobs", "Careers", "Jobs", "Job ID: 10386857"
const SUFFIX = /(?:\s+|\.)(?:careers?|jobs?)$/i
const NOT_A_NAME = /^(?:careers?|jobs?|job (?:details|description)|home)$|^job id\b/i

// Letters and digits only, lowercased, for matching parts against the URL.
const key = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

function tabTitleParts(): { title?: string; company?: string } {
  // A browser's document.title is the first <title> anywhere; linkedom's only
  // looks in <head>, and Amazon's sits in <body>.
  const tab = (document.title || document.querySelector('title')?.textContent || '').trim()
  const parts = tab.split(SEPARATOR).map((p) => p.trim().replace(SUFFIX, '').trim())
    .filter((p) => p && !NOT_A_NAME.test(p))
  if (parts.length < 2) return { title: parts[0] }

  // The company is the part the URL names (amazon.jobs, jobs.ashbyhq.com/riveron,
  // /position/2552/ramon.space), else the last one: "<job> | <company>" is the
  // usual order. Hyphenated path segments are skipped: they're job slugs
  // ("/jobs/senior-designer"), and would match the title.
  const { hostname, pathname } = window.location
  const urlKeys = new Set([...hostname.split('.'), ...pathname.split('/').filter((s) => !/[-_]/.test(s))].map(key).filter(Boolean))
  const company = parts.find((p) => urlKeys.has(key(p))) ?? parts[parts.length - 1]
  return { title: parts.find((p) => p !== company), company: company.length <= 60 ? company : undefined }
}

export function companyFromTabTitle(): string {
  return tabTitleParts().company ?? 'Unknown Company'
}

export function titleFromTabTitle(): string | undefined {
  return tabTitleParts().title
}
