// What each saved fixture must scrape to. Shared by the extension's fixture
// tests and the backend's scrape-function test, so both check the same thing.
// `ends` is text from the end of the posting: it proves the scraper took the
// whole description, not only the first section.
export const FIXTURE_CASES = [
  { board: 'greenhouse', title: 'Anthropic Fellows Program, AI Safety & Security', company: 'Anthropic', ends: 'for using AI in our application process.' },
  // Signed-in job search on my.greenhouse.io with a posting open in its pop-up,
  // cut down to three results, with every company, title and line of posting
  // text made up. The pop-up has no <h1> and ends with the application form.
  { board: 'greenhouse-modal', title: 'Platform Engineer', company: 'Fabrikam', ends: 'Applicants must be able to work in Canada.' },
  { board: 'lever', title: 'Administrative Business Partner', company: 'Palantir Technologies', ends: 'Internet Crime Complaint Center (IC3).' },
  { board: 'ashby', title: 'AI Systems Engineer, Codex Agents', company: 'OpenAI', ends: 'Join us in shaping the future of technology.' },
  { board: 'workable', title: 'Senior Open-Source Python Engineer, ML Developer Tools - EMEA Remote', company: 'Hugging Face', ends: 'Join a community supporting the ML/AI community.' },
  { board: 'workday', title: 'Senior Applied AI Engineer', company: 'Nvidia', ends: 'or any other characteristic protected by law.' },
  { board: 'bamboohr', title: 'Senior Business Analyst', company: 'Picton Mahoney Asset Management', ends: 'All decisions are made by our hiring team.' },
  // Signed-out /jobs/view/ page: read from its JSON-LD
  { board: 'linkedin', title: 'RN - SAU', company: 'INTEGRIS Health', ends: 'including protected veteran or disability status.' },
  // Signed-in /jobs/view/ page for a posting already applied to, cut down to the
  // posting by hand (no nav, people or job lists), with the company and text made
  // up. "Application status" sits between the title and the description; "About
  // the company" links the company with its follower count; the description
  // continues after its box.
  { board: 'linkedin-applied', title: 'Frontend Developer', company: 'Northwind', ends: 'Northwind Applicant Privacy Notice' },
  // Terminal's public posting page
  { board: 'terminal', title: 'Data Engineer', company: 'Overflow', ends: '- SQL' },
  // No dedicated scraper: schema.org microdata through the generic one (no JSON-LD on the page)
  { board: 'smartrecruiters', title: 'Housekeeping Associate, Downtown San Diego', company: 'Equinox', ends: 'Must have a legal right to work in the United States.' },
  // Indeed's 2026 layout: same detail pane on /viewjob and in the search page's right-hand pane
  { board: 'indeed', title: 'Welder', company: 'Bleema Manufacturing Corporation', ends: '1 year experience in shop setting' },
  { board: 'indeed-search', title: 'Welder', company: 'Bleema Manufacturing Corporation', ends: '1 year experience in shop setting' },
]

// Line 1 of every fixture is `<!-- {url} saved {date} -->`.
export const fixtureUrl = (html: string) => html.match(/^<!-- (\S+)/)![1]
