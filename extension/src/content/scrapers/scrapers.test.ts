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
  // Comments aren't elements but still cost a node each
  expect(() => scrape('https://careers.example.com/jobs/1', `<html><body>${'<!---->'.repeat(200_000)}</body></html>`)).toThrow('too large')
  // 50,000 microdata sections fit the caps; finding the outermost must not
  // compare every pair of them
  const nestedSections = '<div itemprop="description">x</div>'.repeat(50_000)
  const start = performance.now()
  scrape('https://careers.example.com/jobs/1', `<html><body><main itemscope itemtype="https://schema.org/JobPosting"><h1 itemprop="title">Clerk</h1>${nestedSections}</main></body></html>`)
  expect(performance.now() - start).toBeLessThan(2000)
  // Nested declarative shadow roots, counted before they're attached
  const nested = '<div><template shadowrootmode="open">'.repeat(300) + 'x' + '</template></div>'.repeat(300)
  expect(() => scrape('https://careers.example.com/jobs/1', `<html><body>${nested}</body></html>`)).toThrow('too large')
})

test('LinkedIn signed-in layout: posting links only, named company, no "… more"', () => {
  // A top card with a logo-only company link and the name as plain text, an
  // "Application status" link into the jobs area, a posting with no list (the
  // button stays in the box) that links another company, and the "About the
  // company" card below with its "Show more" link. Then the same pane beside a
  // job list whose card links another company, as on the search page.
  const pane = `<div>
    <div><a href="https://www.linkedin.com/company/acme/life/"><img alt=""></a>
      <div data-display-contents="true"><p>Senior Data Analyst<span></span></p></div><p>Acme</p></div>
    <div><div data-display-contents="true"><p><a href="https://www.linkedin.com/jobs/tracker/applied/">See application</a></p></div>
      <div><h2>About the job</h2><p><span data-testid="expandable-text-box">Analyse sales data for the regional team, backed by <a href="https://www.linkedin.com/company/globex/">Globex</a>.<button data-testid="expandable-text-button">… more</button></span></p></div>
      <div><h2>About the company</h2><a href="https://www.linkedin.com/company/acme/life/"><p>Acme</p><p>1,234 followers</p></a>
        <a href="https://www.linkedin.com/company/acme/life/">Show more</a></div></div></div>`
  const list = `<ul><li><a href="https://www.linkedin.com/company/othercorp/">OtherCorp</a></li></ul>`
  const expected = { title: 'Senior Data Analyst', company: 'Acme', description: 'Analyse sales data for the regional team, backed by Globex.' }
  expect(scrape('https://www.linkedin.com/jobs/view/1/', `<html><body><main>${pane}</main></body></html>`)).toMatchObject(expected)
  expect(scrape('https://www.linkedin.com/jobs/search-results/?currentJobId=1', `<html><body><main>${list}${pane}</main></body></html>`)).toMatchObject(expected)
})

// Pages within the size caps, each built against one loop that once grew
// faster than the page. Each `main` goes inside a doctyped page, as every
// snapshot is (snapshot.ts).
const box = (inner = 'a') => `<p><span data-testid="expandable-text-box">${inner}</span></p>`
const deepBox = (inner?: string) => '<div>'.repeat(16) + `<div><h2>About the job</h2>${box(inner)}</div>` + '</div>'.repeat(16)
const companyLink = (slug: string, inner: string) => `<a href="https://www.linkedin.com/company/${slug}/">${inner}</a>`
test('LinkedIn description runs past the list with a hidden sibling above the box', () => {
  const hidden = scrape('https://www.linkedin.com/jobs/view/1/', `<html><body><main><div data-display-contents="true"><p>Senior Data Analyst<span></span></p></div>
    <div><div hidden>${'Hidden note. '.repeat(20)}</div><h2>About the job</h2><p><span data-testid="expandable-text-box">We build widgets.</span></p><ul><li>Ship weekly dashboards</li></ul><p>Join us.</p>
    <button data-testid="expandable-text-button">… more</button></div></main></body></html>`)
  expect(hidden.description).toBe('We build widgets.\n\nShip weekly dashboards\n\nJoin us.')
  // Expanded posting: the button is hidden, so the end is the line after the
  // divider. Hidden siblings are skipped without using up a search, and one
  // whose text also appears inside the box mustn't end it there.
  const expanded = scrape('https://www.linkedin.com/jobs/view/1/', `<html><body><main><div data-display-contents="true"><p>Senior Data Analyst<span></span></p></div>
    <div><h2>About the job</h2><p><span data-testid="expandable-text-box">We offer Medical insurance and a learning budget.</span></p><ul><li>Ship weekly dashboards</li></ul>
    <button data-testid="expandable-text-button" hidden>… more</button><div hidden>Medical insurance</div><div hidden>Apply by Friday</div><p></p><hr><p>Benefits found in job post</p><p>Vision insurance</p></div></main></body></html>`)
  expect(expanded.description).toBe('We offer Medical insurance and a learning budget.\n\nShip weekly dashboards')
})

test.each([
  // A backtracking "… more" regex goes quadratic on a long whitespace run
  { case: '40,000 line breaks in the box', main: deepBox(`a${'<br>'.repeat(40_000)}b`), company: 'Unknown Company' },
  // Each link read once, not once per level, and compared by tree order, not
  // by walking its siblings
  { case: '29,000 sibling company links', main: deepBox() + Array.from({ length: 29_000 }, (_, i) => companyLink(`c${i}`, `<p>C${i}</p>`)).join(''), company: 'C0' },
  // The title fallback compares every <p> near the first company link (88 s on master)
  { case: '29,000 paragraphs beside a company link', main: companyLink('c', 'C') + '<p>1 hour ago</p>'.repeat(29_000) + deepBox(), company: 'C' },
  // The title walk judges each candidate once, not at each of its 12 levels
  { case: '19,000 title candidates beside the box', main: `<div>${'<div data-display-contents="true"><p>1 hour ago</p></div>'.repeat(19_000)}<div>${box()}</div></div>`, company: 'Unknown Company' },
  // ...and isUIChrome walks ancestors instead of compiling a selector each time
  { case: '19,000 title candidates 200 levels deep', main: '<div>'.repeat(200) + `<div>${'<div data-display-contents="true"><p>1 hour ago</p></div>'.repeat(19_000)}<div>${box()}</div></div>` + '</div>'.repeat(200), company: 'Unknown Company' },
  // linkedom lets <a> nest: links inside a judged link are skipped, not each
  // read whole (0.17 s now, 1.35 s before; the depth cap keeps it from growing)
  { case: '120 nested company links', main: `<div>${box()}</div>` + '<a href="https://www.linkedin.com/company/c/">C<div>'.repeat(120) + '<i></i>'.repeat(55_000) + '</div></a>'.repeat(120), company: 'C', limit: 800 },
  // linkedom nests <p> too: a candidate's span holding a block isn't read
  // (each would read everything below it)
  { case: '80 nested title candidates', main: `<div>${'<div data-display-contents="true"><p><span>'.repeat(80)}${'<i>x</i>'.repeat(55_000)}${'</span></p></div>'.repeat(80)}<div>${box()}</div></div>`, company: 'Unknown Company', limit: 2000 },
  // The last-resort company search skips nested links too
  { case: '120 nested "Show more" links', main: `<div>${box()}</div>` + '<a href="https://www.linkedin.com/company/c/">Show more<div>'.repeat(120) + '<i></i>'.repeat(55_000) + '</div></a>'.repeat(120), company: 'Unknown Company', limit: 800 },
  // Long text never reaches the "(verified job)" regexes, which backtrack on
  // whitespace runs (7 s at 100,000 spaces)
  { case: 'a span candidate with 100,000 spaces', main: `<div><div data-display-contents="true"><p><span>a${' '.repeat(100_000)}b</span></p></div><div>${box()}</div></div>`, company: 'Unknown Company' },
  { case: 'a link candidate with 100,000 spaces', main: `<div><div data-display-contents="true"><p><a href="https://www.linkedin.com/jobs/view/1/">a${' '.repeat(100_000)}b</a></p></div><div>${box()}</div></div>`, company: 'Unknown Company' },
  // JSON can write "<" as \u003c past the tag cap; the tag-stripping regex
  // must not backtrack over a run of them
  { case: 'JSON-LD with 200,000 "<" and no ">"', main: `<script type="application/ld+json">{"@type":"JobPosting","title":"x","description":"${'\\u003c'.repeat(200_000)}"}</script>`, company: 'Unknown Company' },
  // ...and what's left after stripping can't pair up into tags that the entity
  // decoder (an uncapped DOMParser) would then parse
  { case: 'JSON-LD with 100,000 "<<b>div>"', main: `<script type="application/ld+json">{"@type":"JobPosting","title":"x","description":"${'\\u003c\\u003cb>div>'.repeat(100_000)}"}</script>`, company: 'Unknown Company' },
  // The description's end marker is searched for capped at 80 characters, as
  // its start is (lastIndexOf with a long pattern costs text x pattern)
  { case: 'a 100,000-character end marker', main: `<div>${box('x')}<ul><li>y</li></ul><button data-testid="expandable-text-button">${'a'.repeat(100_000)}b</button><div>${'a'.repeat(300_000)}</div></div>`, company: 'Unknown Company' },
  // Markers that miss (hidden siblings the container's text leaves out) stop
  // after 3 searches of 20 characters, not 10 of 80 (1.2 s on 3.9 MB)
  { case: 'twelve hidden end markers after 3.9 MB', main: `<div>${box('a'.repeat(3_900_000))}<ul><li>y</li></ul><hr>${`<div hidden>${'a'.repeat(79)}b</div>`.repeat(12)}</div>`, company: 'Unknown Company', limit: 600 },
  // Title cases read direct children by tag, not `:scope >` selectors that
  // scan each nested candidate's whole subtree
  { case: '120 nested <p><span> beside a company link', main: companyLink('c', 'C') + '<p><span>'.repeat(120) + '<i></i>'.repeat(55_000) + '</span></p>'.repeat(120) + deepBox(), company: 'C', limit: 600 },
  // Nested templates: walked and attached through their own children, not
  // deep-copied .content at every level (memory grows levels x subtree). Under
  // 0.3 s now, several seconds before, so a tighter limit.
  { case: '60 nested shadow roots', main: deepBox() + '<div><template shadowrootmode="open">'.repeat(60) + '<i></i>'.repeat(40_000) + '</template></div>'.repeat(60), company: 'Unknown Company', limit: 1500 },
])('LinkedIn pages built to cost work stay cheap: $case', ({ main, company, limit = 5000 }) => {
  const start = performance.now()
  const job = scrape('https://www.linkedin.com/jobs/view/1/', `<!doctype html><html><body><main>${main}</main></body></html>`)
  expect(performance.now() - start).toBeLessThan(limit) // the slow versions took 5 to 200+ s; CI runners are slower than a laptop
  expect(job.company).toBe(company)
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

  test('keeps a stray "<" as text and never turns leftovers into tags', () => {
    const text = (d: string) => page({ '@type': 'JobPosting', title: 'Shift Lead', hiringOrganization: 'Acme', description: d.repeat(10) }).description
    expect(text('Use a<b and <em>c</em>. ')).toMatch(/^Use a<b and c\./)
    expect(text('Salary < 100k and <strong>bonus</strong>. ')).toMatch(/^Salary < 100k and bonus\./)
    expect(text('<<b>div>Lead the team. ')).toMatch(/^<div>Lead the team\./)
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

  // retry: LinkedIn now and then serves a runner's IP a page with no postings;
  // a real markup change fails every attempt.
  // Indeed's bot check needs a visible Chrome window and starts blocking an IP
  // after a few visits, so it can't be smoke-tested on a schedule.
  test.each(BOARDS.filter((b) => !b.headed))('$name', { timeout: 120_000, retry: 2 }, async (board) => {
    const { url, html } = await fetchPosting(browser, board)
    const job = scrape(url, html)
    expect(job.title, url).not.toBe('')
    expect(job.company, url).not.toBe('Unknown Company')
    expect(job.description.length, url).toBeGreaterThan(500)
  })
})
