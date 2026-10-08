// @vitest-environment happy-dom
// Each fixture is a real posting saved by `pnpm fixtures:save` (line 1 holds
// its URL). The tests load it at that URL and run the same router the content
// script runs. Boards change their markup: when a test here fails after a
// re-save, the scraper needs fixing, not the expectation.
//
// `pnpm test:scrapers-live` also runs every board against a live posting (weekly in CI,
// scraper-smoke.yml), so markup changes show up before users report them.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { scrapeJobPage } from './index'

function loadPage(url: string, html: string) {
  ;(window as unknown as { happyDOM: { setURL(url: string): void } }).happyDOM.setURL(url)
  document.open()
  document.write(html)
  document.close()
}

function loadFixture(name: string) {
  const html = readFileSync(join(__dirname, 'fixtures', `${name}.html`), 'utf8')
  loadPage(html.match(/^<!-- (\S+)/)![1], html)
}

// `ends` is text from the end of the posting: it proves the scraper took the
// whole description, not only the first section.
const CASES = [
  { board: 'greenhouse', title: 'Anthropic Fellows Program, AI Safety & Security', company: 'Anthropic', ends: 'for using AI in our application process.' },
  { board: 'lever', title: 'Administrative Business Partner', company: 'Palantir Technologies', ends: 'Internet Crime Complaint Center (IC3).' },
  { board: 'ashby', title: 'AI Systems Engineer, Codex Agents', company: 'OpenAI', ends: 'Join us in shaping the future of technology.' },
  { board: 'workable', title: 'Senior Open-Source Python Engineer, ML Developer Tools - EMEA Remote', company: 'Hugging Face', ends: 'Join a community supporting the ML/AI community.' },
  { board: 'workday', title: 'Senior Applied AI Engineer', company: 'Nvidia', ends: 'or any other characteristic protected by law.' },
  { board: 'bamboohr', title: 'Senior Business Analyst', company: 'Picton Mahoney Asset Management', ends: 'All decisions are made by our hiring team.' },
  // Signed-out /jobs/view/ page: read from its JSON-LD
  { board: 'linkedin', title: 'RN - SAU', company: 'INTEGRIS Health', ends: 'including protected veteran or disability status.' },
]

describe('scrapers on saved postings', () => {
  test.each(CASES)('$board', ({ board, title, company, ends }) => {
    loadFixture(board)
    const job = scrapeJobPage()
    expect(job.title).toBe(title)
    expect(job.company).toBe(company)
    expect(job.description.trim().endsWith(ends)).toBe(true)
    // No page chrome, no undecoded entities
    expect(job.description).not.toMatch(/Back to jobs|Apply for this job|&amp;|&nbsp;|&lt;/)
  })
})

describe('JSON-LD', () => {
  const page = (ld: unknown) =>
    loadPage('https://careers.example.com/jobs/1', `<html><body><script type="application/ld+json">${JSON.stringify(ld)}</script></body></html>`)
  const description = '<p>Lead the night shift &amp; train new staff.</p><ul><li>Two years of experience</li><li>Forklift licence</li></ul>'.repeat(2)

  test('reads a posting inside @graph, with breaks kept and entities decoded', () => {
    page({ '@graph': [{ '@type': 'WebPage' }, { '@type': ['JobPosting'], title: 'Shift Lead', hiringOrganization: { name: 'Acme &amp; Co' }, description }] })
    const job = scrapeJobPage()
    expect(job.company).toBe('Acme & Co')
    expect(job.description).toMatch(/^Lead the night shift & train new staff\.\n\n- Two years of experience\n- Forklift licence\n/)
  })

  test('decodes descriptions whose HTML is itself entity-encoded (LinkedIn)', () => {
    page({ '@type': 'JobPosting', title: 'Shift Lead', hiringOrganization: 'Acme', description: description.replace(/</g, '&lt;').replace(/>/g, '&gt;') })
    expect(scrapeJobPage().description).toMatch(/^Lead the night shift & train new staff\.\n\n- Two years/)
  })
})

describe.runIf(import.meta.env.MODE === 'smoke')('scrapers on live postings', async () => {
  const { chromium } = await import('playwright')
  const { BOARDS, fetchPosting } = await import('../../../scripts/scraper-fixtures')
  // Launch in beforeAll: the describe body runs even when the suite is skipped.
  let browser: Awaited<ReturnType<typeof chromium.launch>>
  beforeAll(async () => { browser = await chromium.launch() })
  afterAll(() => browser?.close())

  test.each(BOARDS)('$name', { timeout: 120_000 }, async (board) => {
    const { url, html } = await fetchPosting(browser, board)
    loadPage(url, html)
    const job = scrapeJobPage()
    expect(job.title, url).not.toBe('')
    expect(job.company, url).not.toBe('Unknown Company')
    expect(job.description.length, url).toBeGreaterThan(500)
  })
})
