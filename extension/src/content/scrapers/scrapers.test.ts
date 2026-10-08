/// <reference types="vite/client" />
// Each fixture is a real posting saved by `pnpm fixtures:save` (line 1 holds
// its URL). The tests run it through scrapeHtml() on linkedom, exactly as the
// scrape Edge Function does; the bundled copy runs the same scrapers in Chrome. Boards change their markup: when a test here fails after a
// re-save, the scraper needs fixing, not the expectation.
//
// `pnpm test:scrapers-live` also runs every board against a live posting (weekly in CI,
// scraper-smoke.yml), so markup changes show up before users report them.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseHTML } from 'linkedom'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { FIXTURE_CASES, fixtureUrl } from './fixtures/cases.ts'
import { scrapeHtml } from './page.ts'

const scrape = (url: string, html: string) => scrapeHtml(parseHTML, url, html)

describe('scrapers on saved postings', () => {
  test.each(FIXTURE_CASES)('$board', ({ board, title, company, ends }) => {
    const html = readFileSync(join(__dirname, 'fixtures', `${board}.html`), 'utf8')
    const job = scrape(fixtureUrl(html), html)
    expect(job.title).toBe(title)
    expect(job.company).toBe(company)
    expect(job.description.trim().endsWith(ends)).toBe(true)
    // No page chrome, no undecoded entities
    expect(job.description).not.toMatch(/Back to jobs|Apply for this job|&amp;|&nbsp;|&lt;/)
  })
})

test('refuses pages nested far deeper than any real posting', () => {
  expect(() => scrape('https://careers.example.com/jobs/1', `<html><body>${'<div>'.repeat(300)}x${'</div>'.repeat(300)}</body></html>`))
    .toThrow('too large')
})

describe('JSON-LD', () => {
  const page = (ld: unknown) =>
    scrape('https://careers.example.com/jobs/1', `<html><body><script type="application/ld+json">${JSON.stringify(ld)}</script></body></html>`)
  const description = '<p>Lead the night shift &amp; train new staff.</p><ul><li>Two years of experience</li><li>Forklift licence</li></ul>'.repeat(2)

  test('reads a posting inside @graph, with breaks kept and entities decoded', () => {
    const job = page({ '@graph': [{ '@type': 'WebPage' }, { '@type': ['JobPosting'], title: 'Shift Lead', hiringOrganization: { name: 'Acme &amp; Co' }, description }] })
    expect(job.company).toBe('Acme & Co')
    expect(job.description).toMatch(/^Lead the night shift & train new staff\.\n\n- Two years of experience\n- Forklift licence\n/)
  })

  test('decodes descriptions whose HTML is itself entity-encoded (LinkedIn)', () => {
    const job = page({ '@type': 'JobPosting', title: 'Shift Lead', hiringOrganization: 'Acme', description: description.replace(/</g, '&lt;').replace(/>/g, '&gt;') })
    expect(job.description).toMatch(/^Lead the night shift & train new staff\.\n\n- Two years/)
  })
})

describe.runIf(import.meta.env.MODE === 'smoke')('scrapers on live postings', async () => {
  const { BOARDS, fetchPosting, launchBrowsers, takeSnapshot } = await import('../../../scripts/scraper-fixtures')
  // Launch in beforeAll: the describe body runs even when the suite is skipped.
  let browser: Awaited<ReturnType<typeof launchBrowsers>>
  beforeAll(async () => { browser = await launchBrowsers() })
  afterAll(() => browser?.close())

  // The capture path the fixtures can't show: LinkedIn's signed-in pages put
  // the job pane in an open shadow root, which the snapshot must carry.
  test('snapshot keeps open shadow roots and drops scripts, tokens and data blobs', async () => {
    const page = await browser.headless.newPage()
    const description = 'Analyse sales data and build weekly dashboards for the regional team. '.repeat(8)
    await page.setContent(`<html><body><div id="interop-outlet"><template shadowrootmode="open">
      <div><div data-display-contents="true"><p>Senior Data Analyst</p></div>
      <a href="https://www.linkedin.com/company/acme/life/">Acme Corp</a>
      <span data-testid="expandable-text-box">${description}</span></div></template></div>
      <script>window.secretSession = 'abc123'</script>
      <meta name="csrf-token" content="csrf456"><input type="hidden" name="csrf" value="csrf789"><a href="https://www.linkedin.com/m/logout/?csrfToken=tok321">Sign out</a>
      <div data-props='${JSON.stringify({ member: { email: 'me@example.com', blob: 'x'.repeat(400) } })}'></div></body></html>`)
    const { html } = await takeSnapshot(page)
    await page.close()
    for (const secret of ['abc123', 'csrf456', 'csrf789', 'tok321', 'me@example.com']) expect(html).not.toContain(secret)
    const job = scrape('https://www.linkedin.com/jobs/view/1', html)
    expect(job).toMatchObject({ title: 'Senior Data Analyst', company: 'Acme Corp', description: description.trim() })
  })

  // Indeed's bot check needs a visible Chrome window and starts blocking an IP
  // after a few visits, so it can't be smoke-tested on a schedule.
  test.each(BOARDS.filter((b) => !b.headed))('$name', { timeout: 120_000 }, async (board) => {
    const { url, html } = await fetchPosting(browser, board)
    const job = scrape(url, html)
    expect(job.title, url).not.toBe('')
    expect(job.company, url).not.toBe('Unknown Company')
    expect(job.description.length, url).toBeGreaterThan(500)
  })
})
