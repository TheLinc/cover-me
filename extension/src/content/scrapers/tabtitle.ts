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
  'careerbuilder', 'joinhandshake', 'handshake', 'hiringcafe', 'wellfound', 'finn', 'jobsdb', 'stepstone',
  'ycombinator', 'builtin', 'himalayas', 'remotive', 'weworkremotely', 'welcometothejungle', 'otta'])

// Letters and digits only, lowercased, for matching parts against the URL.
const key = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

// The company the tab title names, else "Unknown Company", and the job in it.
export function fromTabTitle(): { company: string; title?: string } {
  // A browser's document.title is the first <title> anywhere; linkedom's only
  // looks in <head>, and Amazon's sits in <body>. Whitespace is collapsed and
  // the length capped first, so the patterns above never backtrack far.
  const tab = (document.title || document.querySelector('title')?.textContent || '').slice(0, 1000).replace(/\s+/g, ' ').trim().slice(0, 300)
  const parts = tab.split(SEPARATOR).map((p) => p.trim().replace(SUFFIX, '').trim())
    .filter((p) => p && !NOT_A_NAME.test(p))

  // The hostname first (careers.acme.com). Then the path's first segment, where
  // job boards put the employer (jobs.ashbyhq.com/riveron), or a domain in it
  // (/position/2552/ramon.space). Other segments are places and job slugs
  // ("/job/atlanta/accountant"), and locales ("/us/en") are too short to count.
  const { hostname, pathname } = window.location
  // The first segment counts only with more after it (employer, then job:
  // "/accountant" alone is the job). Hyphenated segments are job slugs
  // ("/senior-auditor") and would match the title.
  const [first = '', ...rest] = pathname.split('/').filter(Boolean)
  const fromPath = [...(rest.length ? [first] : []), ...rest.filter((s) => s.includes('.'))].filter((s) => !/[-_]/.test(s))
  const keys = (s: string[]) => new Set(s.map(key).filter((k) => k.length > 2 && !BOARDS.has(k)))
  const host = keys(hostname.split('.'))
  const named = (set: Set<string>) => [...parts].reverse().find((p) => set.has(key(p)))
  // One part alone can't be told apart from the site's name
  const company = parts.length > 1 ? named(host) ?? named(keys(fromPath)) : undefined
  // The job is the first other part, and never the site's own name
  // ("Careers | Northwind" on careers.northwind.com has none)
  const title = parts.find((p) => p !== company && !host.has(key(p)))
  return { company: company ?? 'Unknown Company', title }
}
