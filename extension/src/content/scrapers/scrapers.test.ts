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

describe('company and title when the page doesn\'t name them (#200)', () => {
  // An Ashby posting reached from the board's own listing has no JSON-LD (it's
  // rendered in the first page load only), so the selectors read it, and the
  // company comes from the tab title "<job> @ OpenAI".
  test('Ashby posting without JSON-LD', () => {
    const html = readFileSync(join(__dirname, 'fixtures', 'ashby.html'), 'utf8')
      .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')
    expect(scrape(fixtureUrl(html), html)).toMatchObject({ title: 'AI Systems Engineer, Codex Agents', company: 'OpenAI' })
  })

  const description = `<p>${"Audit the finance team's controls and report to the board each quarter. ".repeat(10)}</p>`
  const posting = (h1: string, tab: string, url = 'https://careers.northwind.com/jobs/79') =>
    scrape(url, `<!doctype html><html><head><title>${tab}</title></head><body><main><h1>${h1}</h1><div><h2>Senior Auditor</h2>${description}</div></main></body></html>`)

  // Headings seen as saved titles in production
  test.each(['Key Responsibilities', 'Job Description', 'job details', 'CAREERS', 'Careers at Northwind.', 'NORTHWIND CAREER PORTAL', 'About the role'])(
    'an <h1> of "%s" is a heading, not the title', (h1) => {
      expect(posting(h1, 'Senior Auditor | Northwind')).toMatchObject({ title: 'Senior Auditor', company: 'Northwind' })
    })

  test('an <h1> naming the employer is not the title', () => {
    expect(posting('Northwind', 'Senior Auditor | Northwind').title).toBe('Senior Auditor')
  })

  test('the company is the tab title part the URL names, wherever it sits', () => {
    expect(posting('Senior Auditor', 'Northwind - Senior Auditor')).toMatchObject({ title: 'Senior Auditor', company: 'Northwind' })
    expect(posting('Key Responsibilities', 'Northwind - Senior Auditor').title).toBe('Senior Auditor')
    // A job slug in the path doesn't make the title the company
    expect(posting('Senior Auditor', 'Senior Auditor - Northwind', 'https://careers.example.com/jobs/senior-auditor').company).toBe('Unknown Company')
  })

  // A wrong name is worse than none: a part the URL doesn't name may be a
  // place or a requisition number, and a job board names itself
  test.each([
    ['a place', 'Senior Auditor', 'Senior Auditor - Remote', 'https://careers.example.com/jobs/79'],
    ['a requisition number', 'Senior Auditor', 'Senior Auditor - R0012345', 'https://careers.example.com/jobs/79'],
    ['a job board', 'Senior Auditor', 'Senior Auditor - Northwind | SEEK', 'https://www.seek.com.au/job/79'],
    ['a job board', 'Senior Auditor', 'Senior Auditor at Northwind | Y Combinator', 'https://www.ycombinator.com/companies/northwind/jobs/79'],
    // Path segments other than the first are places and job slugs
    ['a place the path names', 'Senior Auditor', 'Senior Auditor - Atlanta', 'https://careers.example.com/job/atlanta/senior-auditor/79'],
    ['a job the path names', 'Auditor', 'Auditor | Northwind', 'https://careers.example.com/jobs/auditor'],
    ['a job the only path segment names', 'Auditor', 'Auditor | Northwind', 'https://careers.example.com/auditor'],
    ['a locale the path names', 'Auditor', 'Auditor - US | Northwind', 'https://careers.example.com/us/en/job/79'],
  ])('a tab title with %s keeps Unknown Company', (_, h1, tab, url) => {
    expect(posting(h1, tab, url)).toMatchObject({ title: h1, company: 'Unknown Company' })
  })

  test('the hostname wins over the path', () => {
    expect(posting('Auditor', 'Auditor - US | Northwind', 'https://careers.northwind.com/us/en/job/79'))
      .toMatchObject({ title: 'Auditor', company: 'Northwind' })
  })

  // An embedded Greenhouse form's URL is /embed/job_app?for=anthropic: the
  // company is only in the tab title's own wording
  test('Greenhouse embed', () => {
    const html = readFileSync(join(__dirname, 'fixtures', 'greenhouse.html'), 'utf8')
    expect(scrape('https://job-boards.greenhouse.io/embed/job_app', html).company).toBe('Anthropic')
  })

  // "Job Application for ... at (.+)$" retries at every " at "
  test('a Greenhouse-style tab title of 40,000 " at " stays cheap', () => {
    const start = performance.now()
    scrape('https://careers.example.com/jobs/79', `<!doctype html><html><head><title>Job Application for x${' at '.repeat(40_000)}\n</title></head>
      <body><h1 class="title">Senior Auditor</h1><div id="content">${description}</div></body></html>`)
    expect(performance.now() - start).toBeLessThan(2000)
  })

  // Every element marked with the URL's job ID was measured, each walking its
  // subtree, once per repeat of the ID in the URL (8 s before). Spans cost the
  // rest of the heuristic nothing, so this shows they're no longer measured;
  // nested divs cost master's own block pass more than the per-ID cap saves.
  test('elements marked with the URL\'s job ID, nested 250 deep, stay cheap', () => {
    const chain = '<span data-id="1234567">'.repeat(250) + 'x' + '</span>'.repeat(250)
    const start = performance.now()
    expect(() => scrape('https://careers.example.com/1234567/1234567/1234567', `<!doctype html><html><body>${chain.repeat(230)}</body></html>`)).toThrow()
    expect(performance.now() - start).toBeLessThan(2000)
  })

  // The tab title is read once per scrape, not once per JSON-LD posting
  test('many JSON-LD postings without a company and a long tab title stay cheap', () => {
    const nodes = JSON.stringify(Array.from({ length: 2000 }, () => ({ '@type': 'JobPosting', title: 'x', description: 'y' })))
    const start = performance.now()
    expect(() => scrape('https://careers.example.com/jobs/79',
      `<!doctype html><html><head><title>${'a '.repeat(500_000)}</title><script type="application/ld+json">${nodes}</script></head><body></body></html>`)).toThrow()
    expect(performance.now() - start).toBeLessThan(2000)
  })

  // Taleo: the job is in the tab title even when the company isn't
  test('a heading <h1> takes the job from a tab title that names no company', () => {
    expect(posting('Job Description', 'Job Description - Senior Auditor (2600000S)', 'https://northwind.taleo.net/careersection/ex1/jobdetail.ftl'))
      .toMatchObject({ title: 'Senior Auditor (2600000S)', company: 'Unknown Company' })
  })

  test('a short header that opens with the title doesn\'t replace the description beside it', () => {
    const header = `<p>${'Atlanta, GA. Full time. Apply by Friday. '.repeat(15)}</p>`
    const job = scrape('https://careers.example.com/jobs/79', `<!doctype html><html><body><main><div><h1>Senior Auditor</h1>${header}</div>
      <section>${description.repeat(4)}</section></main></body></html>`)
    expect(job.description).toMatch(/^Audit the finance team/)
  })

  // The page is a posting: the heading beats failing, and the user can fix it
  test('a section heading stays the title when the tab title has no job', () => {
    expect(posting('Job Details', 'Job Details | Northwind').title).toBe('Job Details')
  })

  // A logo in the <h1>: no heading was rejected, so the tab title isn't read
  // as a job (on master the top frame failed, and a posting in a frame won)
  test('an <h1> holding only a logo doesn\'t fall back to the tab title', () => {
    expect(() => posting('<a href="/"><img alt="Northwind"></a>', 'Open Positions | Northwind', 'https://www.northwind.com/careers'))
      .toThrow('Could not find job details')
  })

  test('a block that opens with the title doesn\'t cut off the requirements after it', () => {
    const requirements = `<p>${'Five years of external audit experience and a CPA. '.repeat(11)}</p>`
    const job = scrape('https://careers.example.com/jobs/79', `<!doctype html><html><body><div class="job"><div>Careers / Finance</div>
      <div><h1>Senior Auditor</h1>${description}</div><div><h2>Requirements</h2>${requirements}</div></div></body></html>`)
    expect(job.description).toMatch(/^Careers \/ Finance[\s\S]*Five years of external audit experience and a CPA\.$/)
  })

  // Company first or job first can't be told apart when the URL names neither
  test('a two-part tab title the URL doesn\'t name gives no job', () => {
    expect(posting('Key Responsibilities', 'Wiz - Director of Finance', 'https://employer.example.io/position/2600/79').title)
      .toBe('Key Responsibilities')
  })

  test('a long hero <h1> doesn\'t stop a section heading from being the title', () => {
    expect(posting(`${'We are hiring people who love numbers, '.repeat(4)}</h1><h1>Overview`, 'Overview').title).toBe('Overview')
  })

  // A career page around an embedded posting: the top frame fails so the
  // posting's frame wins. The part left after "Careers" is the site's name,
  // and a later <h1> (a hidden privacy dialog's) isn't the title either.
  test.each([
    ['CAREERS', 'Careers | Hourglass', 'https://www.hourglasscosmetics.com/pages/careers?gh_jid=8930465002'],
    ['CAREERS</h1><h1>Do Not Sell/Share My Personal Information', 'Careers | Hourglass', 'https://www.hourglasscosmetics.com/pages/careers?gh_jid=8930465002'],
    ['Careers at Northwind.', 'Careers | Northwind', 'https://www.northwind.com/careers?ashby_jid=0fe4817e'],
  ])('a site heading over an embedded posting is no job: %s', (h1, tab, url) => {
    expect(() => posting(h1, tab, url)).toThrow('Could not find job details')
  })

  // Without an embed the posting is on the page: the heading beats failing, as
  // on master ("MSC CAREER PORTAL", a tab title with no company)
  test('a site heading stays the title of a posting on the page', () => {
    expect(posting('NORTHWIND CAREER PORTAL', 'CN - Accounts Receivable Specialist job in Mississauga',
      'https://northwind-jobs.example.com/job-details/cn-accounts-receivable-specialist-1761413').title).toBe('NORTHWIND CAREER PORTAL')
  })

  // The tab title is split by patterns that backtrack on whitespace runs
  test('a tab title of 100,000 spaces stays cheap', () => {
    const start = performance.now()
    posting('Senior Auditor', `a${' '.repeat(100_000)}- ${' '.repeat(100_000)}jobs`)
    expect(performance.now() - start).toBeLessThan(2000)
  })
})

describe('generic heuristic', () => {
  const description = 'Lead a team of twelve on the night shift and keep the loading dock on schedule. '.repeat(8).trim()

  // Greenhouse's public board listing: an <h1> of "Open Roles" over a list of
  // job links, once read as a job called "Open Roles" (#64).
  test('reads a listing page as no job, not a job', () => {
    const html = readFileSync(join(__dirname, 'fixtures', 'greenhouse-board.html'), 'utf8')
    expect(() => scrape(fixtureUrl(html), html)).toThrow('Could not find job details')
    // A board with an intro above the list: the intro isn't links, so the
    // heading is what gives it away
    const intro = html.replace('<div class="index--header index--header__no-description"></div>',
      `<div class="index--header"><p>${'We build reliable, interpretable AI systems. '.repeat(15)}</p></div>`)
    expect(() => scrape(fixtureUrl(intro), intro)).toThrow('Could not find job details')
  })

  // Listings whose job cards carry plain text (a location, a summary) beside
  // the link, under an intro that isn't links: once read as a job (#72).
  // fly.io's cards each end with a "Read more" link over the card; a
  // Greenhouse board with an intro wraps each row in one link.
  test.each(['flyio-jobs', 'greenhouse-board-intro'])('reads a card listing as no job: %s', (name) => {
    const html = readFileSync(join(__dirname, 'fixtures', `${name}.html`), 'utf8')
    expect(() => scrape(fixtureUrl(html), html)).toThrow('Could not find job details')
  })

  // Cards of a related-jobs panel each carry plain text, so link share alone
  // doesn't keep them out
  const relatedJobs = (n: number) => Array.from({ length: n }, (_, i) => `<li class="job"><a href="/jobs/${i}">Forklift Operator ${i}</a>
    <p>Location: AUS, NSW, Sydney</p><p>Posted ${i + 2} days ago. Move pallets and load trucks on the night shift.</p></li>`).join('')
  const related = relatedJobs(10)
  test('reads a posting without the related jobs listed beside it', () => {
    const job = scrape('https://careers.example.com/jobs/1', `<html><body><main><div><h1>Warehouse Supervisor</h1>
      <div><p>${description}</p></div><div><h2>Related jobs</h2><ul>${related}</ul></div></div></main></body></html>`)
    expect(job.description).toContain(description)
    expect(job.description).not.toMatch(/Forklift|Sydney/)
    // The posting's paragraphs beside the panel, in one block
    const long = `${description} ${description}`
    const together = scrape('https://careers.example.com/jobs/1', `<html><body><main><div><h1>Warehouse Supervisor</h1>
      <p>${long}</p><div><h2>Related jobs</h2><ul>${related}</ul></div></div></main></body></html>`)
    expect(together.description).toContain(long)
    expect(together.description).not.toMatch(/Forklift|Sydney/)
    // ...or the panel a block of its own, larger than the posting beside it
    for (const tag of ['div', 'section']) {
      const siblings = scrape('https://careers.example.com/jobs/1', `<html><body><main><h1>Warehouse Supervisor</h1>
        <div><p>${description}</p></div><${tag}><h2>Related jobs</h2><ul>${related}</ul></${tag}></main></body></html>`)
      expect(siblings.description).toBe(description)
    }
  })

  // Chrome reads a list that isn't rendered as its source text, which the
  // block around it leaves out
  test('a hidden list is not a listing', () => {
    const menu = `<ul>${Array.from({ length: 40 }, (_, i) => `<li><a href="/p/${i}">Product ${i}</a>
        <span>New</span></li>`).join('')}</ul>`
    for (const hidden of ['hidden', 'style="display: none"']) {
      const job = scrape('https://careers.example.com/jobs/1', `<html><body><header><nav ${hidden}>${menu}</nav></header>
        <main><h1>Job Description</h1><div><p>${description}</p><div ${hidden}><ul>${related}</ul></div></div></main></body></html>`)
      expect(job.description).toBe(description)
    }
    // ...but a posting whose full text is hidden behind "Read more" is read
    const job = scrape('https://careers.example.com/jobs/1', `<html><body><main><h1>Warehouse Supervisor</h1><div>
      <div class="preview"><p>${description.slice(0, 150)}</p></div><div class="full" hidden><p>${description}</p></div></div></main></body></html>`)
    expect(job.description).toBe(description)
    // ...even inside a wrapper with a footer
    const footer = `<footer><div>${'Acme Logistics, 1 Dock Road. Privacy. Terms. Accessibility. '.repeat(8)}</div></footer>`
    const wrapped = scrape('https://careers.example.com/jobs/1', `<html><body><div id="app"><main><h1>Warehouse Supervisor</h1><div>
      <div class="preview"><p>${description.slice(0, 150)}</p></div><div class="full" hidden><p>${description} ${description}</p></div></div></main>
      ${footer}</div></body></html>`)
    expect(wrapped.description).toBe(`${description} ${description}`)
    // ...while a listing's hidden mobile copy of its cards isn't
    const cards = `<ul>${relatedJobs(8)}</ul>`
    expect(() => scrape('https://careers.example.com/careers', `<html><body><main><h1>Join Our Team</h1>
      <div class="intro"><p>${description.slice(0, 300)}</p></div><div class="desktop">${cards}</div>
      <div class="mobile" hidden>${cards}</div></main></body></html>`)).toThrow('Could not find job details')
  })

  // The posting has a job's title, so cards larger than it don't make the page
  // a listing
  test('reads a short posting beside a larger related-jobs sidebar', () => {
    const job = scrape('https://careers.example.com/jobs/1', `<html><body><main><h1>Warehouse Supervisor</h1>
      <div><p>${description}</p></div><aside><h2>Related jobs</h2><ul>${related}</ul></aside></main></body></html>`)
    expect(job).toMatchObject({ title: 'Warehouse Supervisor', description })
    // ...nor when the tab title names the job in place of the heading
    const relatedMore = relatedJobs(40)
    const tabbed = scrape('https://careers.acme.com/jobs/1', `<html><head><title>Warehouse Supervisor | Acme</title></head><body><main>
      <h1>Job Description</h1><div><p>${description}</p></div><aside><ul>${relatedMore}</ul></aside></main></body></html>`)
    expect(tabbed).toMatchObject({ title: 'Warehouse Supervisor', description })
    // ...nor a posting sharing its parent with a few cards
    const cards = Array.from({ length: 3 }, (_, i) => `<div class="card"><a href="/jobs/${i}">Forklift Operator ${i}</a><span>Sydney</span></div>`).join('')
    const grid = scrape('https://careers.example.com/jobs/1', `<html><body><main><h1>Warehouse Supervisor</h1>
      <div class="grid"><div class="posting"><p>${description}</p></div>${cards}</div></main></body></html>`)
    expect(grid.description).toContain(description)
    // ...nor a wrapper around the posting and a panel three times its size
    const wrapped = scrape('https://careers.example.com/jobs/1', `<html><body><div id="app"><h1>Warehouse Supervisor</h1>
      <div class="posting"><p>${description}</p></div><div class="sidebar"><ul>${relatedMore}</ul></div></div></body></html>`)
    expect(wrapped.description).toBe(`Warehouse Supervisor\n\n${description}`)
    const short = description.slice(0, 300).trim()
    const shortJob = scrape('https://careers.example.com/jobs/1', `<html><body><main><div class="wrap"><h1>Warehouse Supervisor</h1>
      <div class="posting"><p>${short}</p></div><div class="sidebar"><ul>${relatedMore}</ul></div></div></main></body></html>`)
    expect(shortJob.description).toBe(`Warehouse Supervisor\n\n${short}`)
    // ...nor when the wrapper holds the posting's paragraphs, or sections one
    // of which is a long one about the company
    const paragraphs = scrape('https://careers.example.com/jobs/1', `<html><body><div id="app"><h1>Warehouse Supervisor</h1>
      <p>${description}</p><p>${description}</p><div class="sidebar"><ul>${relatedMore}</ul></div></div>
      <div class="cookie">${'We use cookies to improve your experience. '.repeat(14)}</div></body></html>`)
    expect(paragraphs.description).toBe(`Warehouse Supervisor\n\n${description}\n\n${description}`)
    const sec = `<div class="sec"><p>${description.slice(0, 400)}</p></div>`
    const sections = scrape('https://careers.example.com/jobs/1', `<html><body><div id="app"><h1>Warehouse Supervisor</h1>
      ${sec}${sec}<div class="about"><h2>About Acme</h2><p>${description}</p></div><div class="sidebar"><ul>${relatedMore}</ul></div></div></body></html>`)
    expect(sections.description).toMatch(/^Warehouse Supervisor\n\nLead a team[^]*About Acme/)
    expect(sections.description).not.toMatch(/Forklift|Sydney/)
  })

  // The server's snapshot drops each link's query and fragment, so cards can
  // share one href
  test('reads a card listing as no job when its cards share one link', () => {
    const html = readFileSync(join(__dirname, 'fixtures', 'flyio-jobs.html'), 'utf8').replace(/href="\/jobs\/[^"]+"/g, 'href="/jobs/"')
    expect(() => scrape(fixtureUrl(html), html)).toThrow('Could not find job details')
  })

  // A posting's own lists and sections aren't job cards
  test('keeps a requirements list that links some of its tools', () => {
    const items = ['<a href="https://react.dev">React</a> and TypeScript in production', '<a href="https://go.dev">Go</a> services',
      '<a href="https://postgresql.org">Postgres</a> at scale', 'Mentoring junior engineers',
      '<a href="https://kafka.apache.org">Kafka</a> or another event log', 'On call one week in six']
    const job = scrape('https://careers.example.com/jobs/1', `<html><body><main><h1>Backend Engineer</h1>
      <div><p>${description}</p><ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul></div></main></body></html>`)
    expect(job.description).toContain('Kafka or another event log\nOn call one week in six')
    // ...nor one whose bullets set a word in bold beside the link
    const bold = items.map((i) => `<li>${i.replace(/(\w+)$/, '<b>$1</b>')}</li>`).join('')
    const formatted = scrape('https://careers.example.com/jobs/1', `<html><body><main><h1>Backend Engineer</h1>
      <div><p>${description}</p><ul>${bold}</ul></div></main></body></html>`)
    expect(formatted.description).toContain('Kafka or another event log\nOn call one week in six')
  })

  test('reads a posting laid out in sections of one class', () => {
    // One section holding most of the page
    const job = scrape('https://careers.example.com/jobs/1', `<html><body>
      <div class="row"><a href="/">Home</a></div>
      <div class="row"><h1>Warehouse Supervisor</h1><p>${description}</p><a href="/apply">Apply</a></div>
      <div class="row"><a href="/privacy">Privacy</a></div></body></html>`)
    expect(job).toMatchObject({ title: 'Warehouse Supervisor', description: `Warehouse Supervisor\n\n${description}\n\nApply` })
    // Sections of about one size, each with a link
    const section = (heading: string, href: string) => `<div class="section"><h2>${heading}</h2><p>${description.slice(0, 300)} <a href="${href}">More</a></p><ul><li>${heading}</li></ul></div>`
    const sections = scrape('https://careers.example.com/jobs/1', `<html><body><main><h1>Warehouse Supervisor</h1><div>
      ${section('About us', '/about')}<div class="section"><h2>The role</h2><p>${description.slice(0, 300)}</p></div>
      ${section('Benefits', '/benefits')}${section('Equal opportunity', '/eeo')}</div></main></body></html>`)
    expect(sections.description).toContain('Equal opportunity')
    // ...or from a bullet
    const bullets = (heading: string, href: string) => `<div class="section"><h2>${heading}</h2><ul><li>${description.slice(0, 300)} <a href="${href}">More</a></li></ul></div>`
    const bulleted = scrape('https://careers.example.com/jobs/1', `<html><body><main><h1>Warehouse Supervisor</h1><div>
      ${bullets('About us', '/about')}${bullets('The role', '/role')}${bullets('Benefits', '/benefits')}${bullets('Equal opportunity', '/eeo')}</div></main></body></html>`)
    expect(bulleted.description).toContain('Equal opportunity')
    // ...or from text in a div or span, as some editors write paragraphs
    for (const tag of ['div', 'span']) {
      const prose = (heading: string, href: string) => `<div class="sec"><h3>${heading}</h3><${tag}>${description.slice(0, 300)} <a href="${href}">More</a></${tag}></div>`
      const job = scrape('https://careers.example.com/jobs/1', `<html><body><main><h1>Warehouse Supervisor</h1><div>
        ${prose('About us', '/about')}${prose('The role', 'mailto:jobs@example.com')}${prose('Benefits', '/benefits')}</div></main></body></html>`)
      expect(job.description).toContain('Benefits')
    }
    // ...or from a call to action after the text, or between spans of it
    const cta = (heading: string, href: string) => `<div class="sec"><h2>${heading}</h2><p>${description.slice(0, 200)}</p><a href="${href}">Learn more</a></div>`
    const spans = (heading: string, href: string) => `<div class="sec"><h3>${heading}</h3><div><span>${description.slice(0, 250)} </span><a href="${href}">link</a><span> more.</span></div></div>`
    // with a cookie banner beside it, or inside a wrapper with it
    const cookie = `<div class="cookie">${'We use cookies to improve your experience. '.repeat(14)}</div>`
    for (const section of [cta, spans]) {
      const posting = `<main><h1>Warehouse Supervisor</h1><div class="posting"><div class="sec"><h2>The role</h2><p>${description}</p></div>
        ${section('About us', '/about')}${section('Benefits', '/benefits')}${section('Life at Acme', '/life')}</div></main>`
      const meta = posting.replace('</h1>', '</h1><p>Full time · Sydney</p>')
      // what isn't shown between the title and the posting doesn't count
      const unshown = posting.replace('</h1>', '</h1><style>.x{color:red}</style><div hidden>Share this job</div><button><svg><title>Share</title></svg></button>')
      for (const body of [posting, `${posting}${cookie}`, `<div id="app">${posting}${cookie}</div>`, `${meta}${cookie}`, `<div id="app">${unshown}${cookie}</div>`]) {
        const job = scrape('https://careers.example.com/jobs/1', `<html><body>${body}</body></html>`)
        expect(job.description).toMatch(/^(Warehouse Supervisor\n\n)?The role[^]*Life at Acme/)
      }
    }
  })

  // Each link read once per block, not once per link it's nested in (34 s
  // before, 1 s now)
  test('70 nested links in 100 nested blocks stay cheap', () => {
    const main = '<div>'.repeat(100) + 'x'.repeat(600) + '<a href="/a">L<div>'.repeat(70) + '<i></i>'.repeat(20_000) + '</div></a>'.repeat(70) + '</div>'.repeat(100)
    const start = performance.now()
    scrape('https://careers.example.com/jobs/1', `<!doctype html><html><body><h1>Clerk</h1><main>${main}</main></body></html>`)
    expect(performance.now() - start).toBeLessThan(5000)
  })

  // Each level three cards beside a child holding the next level: card lists
  // measure each level's text (1 s, as master's block search takes)
  test('120 nested card lists over 2 MB stay cheap', () => {
    const card = (i: number, c: string) => `<div><a href="/${c}${i}">${c}${i}</a><b>x</b></div>`
    const main = Array.from({ length: 120 }, (_, i) => `<div>${card(i, 'a')}${card(i, 'b')}${card(i, 'c')}<div>`).join('')
      + 'x'.repeat(2_000_000) + '</div></div>'.repeat(120)
    const start = performance.now()
    expect(() => scrape('https://careers.example.com/jobs/1', `<!doctype html><html><body><h1>Clerk</h1><main>${main}</main></body></html>`)).toThrow()
    expect(performance.now() - start).toBeLessThan(5000)
  })

  test('reads a plain posting, not the larger list of similar jobs beside it', () => {
    const similar = Array.from({ length: 40 }, (_, i) => `<li><a href="/jobs/${i}">Forklift Operator, Night Shift - Toronto</a></li>`).join('')
    const job = scrape('https://careers.example.com/jobs/1', `<html><body><main><h1>Warehouse Supervisor</h1>
      <div><div><p>${description}</p></div><div><h2>Similar jobs</h2><ul>${similar}</ul></div></div></main></body></html>`)
    expect(job).toMatchObject({ title: 'Warehouse Supervisor', company: 'Unknown Company', description })
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
