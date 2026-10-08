// What each saved fixture must scrape to. Shared by the extension's fixture
// tests and the backend's scrape-function test, so both check the same thing.
// `ends` is text from the end of the posting: it proves the scraper took the
// whole description, not only the first section.
export const FIXTURE_CASES = [
  { board: 'greenhouse', title: 'Anthropic Fellows Program, AI Safety & Security', company: 'Anthropic', ends: 'for using AI in our application process.' },
  { board: 'lever', title: 'Administrative Business Partner', company: 'Palantir Technologies', ends: 'Internet Crime Complaint Center (IC3).' },
  { board: 'ashby', title: 'AI Systems Engineer, Codex Agents', company: 'OpenAI', ends: 'Join us in shaping the future of technology.' },
  { board: 'workable', title: 'Senior Open-Source Python Engineer, ML Developer Tools - EMEA Remote', company: 'Hugging Face', ends: 'Join a community supporting the ML/AI community.' },
  { board: 'workday', title: 'Senior Applied AI Engineer', company: 'Nvidia', ends: 'or any other characteristic protected by law.' },
  { board: 'bamboohr', title: 'Senior Business Analyst', company: 'Picton Mahoney Asset Management', ends: 'All decisions are made by our hiring team.' },
  // Signed-out /jobs/view/ page: read from its JSON-LD
  { board: 'linkedin', title: 'RN - SAU', company: 'INTEGRIS Health', ends: 'including protected veteran or disability status.' },
  // Indeed's 2026 layout: same detail pane on /viewjob and in the search page's right-hand pane
  { board: 'indeed', title: 'Welder', company: 'Bleema Manufacturing Corporation', ends: '1 year experience in shop setting' },
  { board: 'indeed-search', title: 'Welder', company: 'Bleema Manufacturing Corporation', ends: '1 year experience in shop setting' },
]

// Line 1 of every fixture is `<!-- {url} saved {date} -->`.
export const fixtureUrl = (html: string) => html.match(/^<!-- (\S+)/)![1]
