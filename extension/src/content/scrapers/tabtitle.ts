// Career sites that don't name the employer in the posting usually do in the
// tab title: "<job> | Amazon.jobs", "<job> - Jobs - Careers at Apple",
// "<job> — Google Careers", "<job> @ Riveron", "RAMON.SPACE - <job>" (#200).
// The snapshot sent to the scrape function drops <meta>, so og:site_name isn't
// there to read; the title is.
//
// A part counts as the company only when the URL names it (amazon.jobs,
// jobs.ashbyhq.com/riveron, /position/2552/ramon.space): a wrong name is worse
// than "Unknown Company", and the other parts are as often a place ("Remote",
// "Atlanta, GA") or a requisition number as an employer.

const SEPARATOR = / (?:[|@·•–—-]|at) /
// "Google Careers", "Amazon.jobs", "Careers", "Jobs", "Job ID: 10386857"
const SUFFIX = /[ .](?:careers?|jobs?)$/i
const NOT_A_NAME = /^(?:careers?|jobs?|job (?:details|description)|home)$|^job id\b/i
// Job boards name themselves in the tab and the URL, not the employer.
// ponytail: a fixed list; boards not on it can still come out as the company.
const BOARDS = new Set(['indeed', 'linkedin', 'glassdoor', 'ziprecruiter', 'seek', 'monster', 'dice', 'simplyhired',
  'careerbuilder', 'joinhandshake', 'handshake', 'hiringcafe', 'wellfound', 'finn', 'jobsdb', 'stepstone'])

// Letters and digits only, lowercased, for matching parts against the URL.
const key = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

// The company the tab title names, else "Unknown Company", and the job beside
// it (only when the company was found, so a lone site name is never a job).
export function fromTabTitle(): { company: string; title?: string } {
  // A browser's document.title is the first <title> anywhere; linkedom's only
  // looks in <head>, and Amazon's sits in <body>. Whitespace is collapsed and
  // the length capped first, so the patterns above never backtrack far.
  const tab = (document.title || document.querySelector('title')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 300)
  const parts = tab.split(SEPARATOR).map((p) => p.trim().replace(SUFFIX, '').trim())
    .filter((p) => p && !NOT_A_NAME.test(p))

  // Hyphenated path segments are skipped: they're job slugs
  // ("/jobs/senior-auditor"), and would match the title.
  const { hostname, pathname } = window.location
  const urlKeys = new Set([...hostname.split('.'), ...pathname.split('/').filter((s) => !/[-_]/.test(s))].map(key).filter(Boolean))
  const company = parts.length > 1 ? parts.find((p) => urlKeys.has(key(p)) && !BOARDS.has(key(p))) : undefined
  if (!company) return { company: 'Unknown Company' }
  return { company, title: parts.find((p) => p !== company) }
}
