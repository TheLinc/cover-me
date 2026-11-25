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
import { afterAll, beforeAll, describe, expect, onTestFinished, test, vi } from 'vitest'
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
    expect(job.description).not.toMatch(/Back to jobs|Apply for this job|&amp;|&nbsp;|&lt;/)
  })
})

describe('company and title when the page doesn\'t name them (#200)', () => {
  // An Ashby posting reached from the board's listing has no JSON-LD (only the
  // first page load renders it), so the company comes from the tab title "<job> @ OpenAI" (#208)
  test('Ashby posting without JSON-LD', () => {
    const html = readFileSync(join(__dirname, 'fixtures', 'ashby.html'), 'utf8')
      .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')
    expect(scrape(fixtureUrl(html), html)).toMatchObject({ title: 'AI Systems Engineer, Codex Agents', company: 'OpenAI' })
  })

  const description = `<p>${"Audit the finance team's controls and report to the board each quarter. ".repeat(10)}</p>`
  const posting = (h1: string, tab: string, url = 'https://careers.northwind.com/jobs/79') =>
    scrape(url, `<!doctype html><html><head><title>${tab}</title></head><body><main><h1>${h1}</h1><div><h2>Senior Auditor</h2>${description}</div></main></body></html>`)

  // Real headings that users saved as job titles (#208)
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
    expect(posting('Senior Auditor', 'Senior Auditor - Northwind', 'https://careers.example.com/jobs/senior-auditor').company).toBe('Unknown Company')
  })

  // A wrong name is worse than none: an unnamed part may be a place or a
  // requisition number, and job boards name themselves (#208)
  test.each([
    ['a place', 'Senior Auditor', 'Senior Auditor - Remote', 'https://careers.example.com/jobs/79'],
    ['a requisition number', 'Senior Auditor', 'Senior Auditor - R0012345', 'https://careers.example.com/jobs/79'],
    ['a job board', 'Senior Auditor', 'Senior Auditor - Northwind | SEEK', 'https://www.seek.com.au/job/79'],
    ['a job board', 'Senior Auditor', 'Senior Auditor at Northwind | Y Combinator', 'https://www.ycombinator.com/companies/northwind/jobs/79'],
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

  // Greenhouse embeds load /embed/job_app?for=<slug>, so only the tab title's
  // wording names the company (#208)
  test('Greenhouse embed', () => {
    const html = readFileSync(join(__dirname, 'fixtures', 'greenhouse.html'), 'utf8')
    expect(scrape('https://job-boards.greenhouse.io/embed/job_app', html).company).toBe('Anthropic')
  })

  // A regex that retries at every " at " goes quadratic on this title (#208)
  test('a Greenhouse-style tab title of 40,000 " at " stays cheap', () => {
    const start = performance.now()
    scrape('https://careers.example.com/jobs/79', `<!doctype html><html><head><title>Job Application for x${' at '.repeat(40_000)}\n</title></head>
      <body><h1 class="title">Senior Auditor</h1><div id="content">${description}</div></body></html>`)
    expect(performance.now() - start).toBeLessThan(2000)
  })

  // Measuring each element marked with the URL's job ID, once per repeat of the ID,
  // takes seconds here. Spans cost the rest of the scrape nothing, so time shows only that (#208)
  test('elements marked with the URL\'s job ID, nested 250 deep, stay cheap', () => {
    const chain = '<span data-id="1234567">'.repeat(250) + 'x' + '</span>'.repeat(250)
    const start = performance.now()
    expect(() => scrape('https://careers.example.com/1234567/1234567/1234567', `<!doctype html><html><body>${chain.repeat(230)}</body></html>`)).toThrow()
    expect(performance.now() - start).toBeLessThan(2000)
  })

  test('many JSON-LD postings without a company and a long tab title stay cheap', () => {
    const nodes = JSON.stringify(Array.from({ length: 2000 }, () => ({ '@type': 'JobPosting', title: 'x', description: 'y' })))
    const start = performance.now()
    expect(() => scrape('https://careers.example.com/jobs/79',
      `<!doctype html><html><head><title>${'a '.repeat(500_000)}</title><script type="application/ld+json">${nodes}</script></head><body></body></html>`)).toThrow()
    expect(performance.now() - start).toBeLessThan(2000)
  })

  // Taleo puts the job in the tab title but not the company (#208)
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

  // On a posting a heading beats failing, since the user can edit a wrong title (#208)
  test('a section heading stays the title when the tab title has no job', () => {
    expect(posting('Job Details', 'Job Details | Northwind').title).toBe('Job Details')
  })

  // Only a rejected heading falls back to the tab title. A logo isn't one, so this
  // page stays no job and a posting in a frame can win (#208)
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

  // Company-first and job-first titles look alike when the URL names neither (#208)
  test('a two-part tab title the URL doesn\'t name gives no job', () => {
    expect(posting('Key Responsibilities', 'Wiz - Director of Finance', 'https://employer.example.io/position/2600/79').title)
      .toBe('Key Responsibilities')
  })

  test('a long hero <h1> doesn\'t stop a section heading from being the title', () => {
    expect(posting(`${'We are hiring people who love numbers, '.repeat(4)}</h1><h1>Overview`, 'Overview').title).toBe('Overview')
  })

  // The top frame fails so the embedded posting's frame wins: "Careers" leaves the
  // site's name, and a hidden dialog's later <h1> isn't the title (#208)
  test.each([
    ['CAREERS', 'Careers | Hourglass', 'https://www.hourglasscosmetics.com/pages/careers?gh_jid=8930465002'],
    ['CAREERS</h1><h1>Do Not Sell/Share My Personal Information', 'Careers | Hourglass', 'https://www.hourglasscosmetics.com/pages/careers?gh_jid=8930465002'],
    ['Careers at Northwind.', 'Careers | Northwind', 'https://www.northwind.com/careers?ashby_jid=0fe4817e'],
  ])('a site heading over an embedded posting is no job: %s', (h1, tab, url) => {
    expect(() => posting(h1, tab, url)).toThrow('Could not find job details')
  })

  // A tab title that names no company can't tell the job from the site's name, so
  // the heading stays (#208)
  test('a site heading stays the title of a posting on the page', () => {
    expect(posting('NORTHWIND CAREER PORTAL', 'CN - Accounts Receivable Specialist job in Mississauga',
      'https://northwind-jobs.example.com/job-details/cn-accounts-receivable-specialist-1761413').title).toBe('NORTHWIND CAREER PORTAL')
  })

  // Splitting the tab title uses regexes that backtrack on whitespace runs (#208)
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
    // The intro above this board's list has no links, so only the heading marks
    // the page as a listing (#74)
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

  // Related-job cards carry plain text too, so link share alone can't rule them out (#215)
  const relatedJobs = (n: number) => Array.from({ length: n }, (_, i) => `<li class="job"><a href="/jobs/${i}">Forklift Operator ${i}</a>
    <p>Location: AUS, NSW, Sydney</p><p>Posted ${i + 2} days ago. Move pallets and load trucks on the night shift.</p></li>`).join('')
  const related = relatedJobs(10)
  test('reads a posting without the related jobs listed beside it', () => {
    const job = scrape('https://careers.example.com/jobs/1', `<html><body><main><div><h1>Warehouse Supervisor</h1>
      <div><p>${description}</p></div><div><h2>Related jobs</h2><ul>${related}</ul></div></div></main></body></html>`)
    expect(job.description).toContain(description)
    expect(job.description).not.toMatch(/Forklift|Sydney/)
    const long = `${description} ${description}`
    const together = scrape('https://careers.example.com/jobs/1', `<html><body><main><div><h1>Warehouse Supervisor</h1>
      <p>${long}</p><div><h2>Related jobs</h2><ul>${related}</ul></div></div></main></body></html>`)
    expect(together.description).toContain(long)
    expect(together.description).not.toMatch(/Forklift|Sydney/)
    for (const tag of ['div', 'section']) {
      const siblings = scrape('https://careers.example.com/jobs/1', `<html><body><main><h1>Warehouse Supervisor</h1>
        <div><p>${description}</p></div><${tag}><h2>Related jobs</h2><ul>${related}</ul></${tag}></main></body></html>`)
      expect(siblings.description).toBe(description)
    }
  })

  // Chrome's innerText reads an unrendered list as its source text, which its
  // parent block leaves out (#215)
  test('a hidden list is not a listing', () => {
    const menu = `<ul>${Array.from({ length: 40 }, (_, i) => `<li><a href="/p/${i}">Product ${i}</a>
        <span>New</span></li>`).join('')}</ul>`
    for (const hidden of ['hidden', 'style="display: none"']) {
      const job = scrape('https://careers.example.com/jobs/1', `<html><body><header><nav ${hidden}>${menu}</nav></header>
        <main><h1>Job Description</h1><div><p>${description}</p><div ${hidden}><ul>${related}</ul></div></div></main></body></html>`)
      expect(job.description).toBe(description)
    }
    const job = scrape('https://careers.example.com/jobs/1', `<html><body><main><h1>Warehouse Supervisor</h1><div>
      <div class="preview"><p>${description.slice(0, 150)}</p></div><div class="full" hidden><p>${description}</p></div></div></main></body></html>`)
    expect(job.description).toBe(description)
    const footer = `<footer><div>${'Acme Logistics, 1 Dock Road. Privacy. Terms. Accessibility. '.repeat(8)}</div></footer>`
    const wrapped = scrape('https://careers.example.com/jobs/1', `<html><body><div id="app"><main><h1>Warehouse Supervisor</h1><div>
      <div class="preview"><p>${description.slice(0, 150)}</p></div><div class="full" hidden><p>${description} ${description}</p></div></div></main>
      ${footer}</div></body></html>`)
    expect(wrapped.description).toBe(`${description} ${description}`)
    // Sections that each end in a "Learn more" link look like cards: under a job's
    // title, the largest hidden block is the last resort (#215)
    const sections = ['The role', 'About us', 'Benefits'].map((h, i) => `<div class="sec"><h2>${h}</h2>
      <p>${description.slice(i * 200, i * 200 + 300)}</p><a href="/more/${i}">Learn more</a></div>`).join('')
    for (const full of [sections, `<div class="wrap">${sections}</div><p>Apply now.</p>`]) {
      const learnMore = scrape('https://careers.example.com/jobs/1', `<html><body><main><h1>Warehouse Supervisor</h1><div>
        <div class="preview"><p>${description.slice(0, 150)}</p></div><div class="full" hidden>${full}</div></div></main></body></html>`)
      expect(learnMore.description).toContain(description.slice(400, 700))
    }
    const cards = `<ul>${relatedJobs(8)}</ul>`
    expect(() => scrape('https://careers.example.com/careers', `<html><body><main><h1>Join Our Team</h1>
      <div class="intro"><p>${description.slice(0, 300)}</p></div><div class="desktop">${cards}</div>
      <div class="mobile" hidden>${cards}</div></main></body></html>`)).toThrow('Could not find job details')
  })

  // Chrome's innerText of a hidden element keeps source indentation (linkedom's
  // doesn't): fly.io's hidden menu measured 2,081 characters for 316 of text (#215)
  test('a hidden menu\'s indentation doesn\'t make it the largest block', () => {
    const asChrome = (html: string) => {
      const dom = parseHTML(html)
      for (const el of dom.document.querySelectorAll('[style*="none"]')) {
        Object.defineProperties(el, { innerText: { get: () => el.textContent }, checkVisibility: { value: () => false } })
      }
      return dom
    }
    vi.stubGlobal('getComputedStyle', () => ({ display: 'none' }))
    onTestFinished(() => { vi.unstubAllGlobals() })
    const menu = Array.from({ length: 30 }, (_, i) => `
                <a href="/p/${i}">Product ${i}</a>
              `).join('')
    expect(() => scrapeHtml(asChrome, 'https://careers.example.com/careers', `<html><body><header><div class="menu" style="display: none">${menu}</div></header>
      <main><h1>Join Our Team</h1><div class="intro"><p>${description.slice(0, 300)}</p></div><div>${`<ul>${relatedJobs(8)}</ul>`}</div></main></body></html>`))
      .toThrow('Could not find job details')
    const job = scrapeHtml(asChrome, 'https://careers.example.com/jobs/1', `<html><body><main><h1>Warehouse Supervisor</h1><div>
      <div class="preview"><p>${description.slice(0, 150)}</p></div>
      <div class="full" style="display: none">
              <p>${description}</p>
      </div></div></main></body></html>`)
    expect(job.description).toBe(description)
  })

  // A job title on the page outweighs a sidebar of cards larger than the posting (#215)
  test('reads a short posting beside a larger related-jobs sidebar', () => {
    const job = scrape('https://careers.example.com/jobs/1', `<html><body><main><h1>Warehouse Supervisor</h1>
      <div><p>${description}</p></div><aside><h2>Related jobs</h2><ul>${related}</ul></aside></main></body></html>`)
    expect(job).toMatchObject({ title: 'Warehouse Supervisor', description })
    const relatedMore = relatedJobs(40)
    const tabbed = scrape('https://careers.acme.com/jobs/1', `<html><head><title>Warehouse Supervisor | Acme</title></head><body><main>
      <h1>Job Description</h1><div><p>${description}</p></div><aside><ul>${relatedMore}</ul></aside></main></body></html>`)
    expect(tabbed).toMatchObject({ title: 'Warehouse Supervisor', description })
    const cards = Array.from({ length: 3 }, (_, i) => `<div class="card"><a href="/jobs/${i}">Forklift Operator ${i}</a><span>Sydney</span></div>`).join('')
    const grid = scrape('https://careers.example.com/jobs/1', `<html><body><main><h1>Warehouse Supervisor</h1>
      <div class="grid"><div class="posting"><p>${description}</p></div>${cards}</div></main></body></html>`)
    expect(grid.description).toContain(description)
    const wrapped = scrape('https://careers.example.com/jobs/1', `<html><body><div id="app"><h1>Warehouse Supervisor</h1>
      <div class="posting"><p>${description}</p></div><div class="sidebar"><ul>${relatedMore}</ul></div></div></body></html>`)
    expect(wrapped.description).toBe(`Warehouse Supervisor\n\n${description}`)
    const short = description.slice(0, 300).trim()
    const shortJob = scrape('https://careers.example.com/jobs/1', `<html><body><main><div class="wrap"><h1>Warehouse Supervisor</h1>
      <div class="posting"><p>${short}</p></div><div class="sidebar"><ul>${relatedMore}</ul></div></div></main></body></html>`)
    expect(shortJob.description).toBe(`Warehouse Supervisor\n\n${short}`)
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

  // Snapshots drop each link's query and fragment, so a listing's cards can share one href (#215)
  test('reads a card listing as no job when its cards share one link', () => {
    const html = readFileSync(join(__dirname, 'fixtures', 'flyio-jobs.html'), 'utf8').replace(/href="\/jobs\/[^"]+"/g, 'href="/jobs/"')
    expect(() => scrape(fixtureUrl(html), html)).toThrow('Could not find job details')
  })

  test('keeps a requirements list that links some of its tools', () => {
    const items = ['<a href="https://react.dev">React</a> and TypeScript in production', '<a href="https://go.dev">Go</a> services',
      '<a href="https://postgresql.org">Postgres</a> at scale', 'Mentoring junior engineers',
      '<a href="https://kafka.apache.org">Kafka</a> or another event log', 'On call one week in six']
    const job = scrape('https://careers.example.com/jobs/1', `<html><body><main><h1>Backend Engineer</h1>
      <div><p>${description}</p><ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul></div></main></body></html>`)
    expect(job.description).toContain('Kafka or another event log\nOn call one week in six')
    const bold = items.map((i) => `<li>${i.replace(/(\w+)$/, '<b>$1</b>')}</li>`).join('')
    const formatted = scrape('https://careers.example.com/jobs/1', `<html><body><main><h1>Backend Engineer</h1>
      <div><p>${description}</p><ul>${bold}</ul></div></main></body></html>`)
    expect(formatted.description).toContain('Kafka or another event log\nOn call one week in six')
  })

  test('reads a posting laid out in sections of one class', () => {
    const job = scrape('https://careers.example.com/jobs/1', `<html><body>
      <div class="row"><a href="/">Home</a></div>
      <div class="row"><h1>Warehouse Supervisor</h1><p>${description}</p><a href="/apply">Apply</a></div>
      <div class="row"><a href="/privacy">Privacy</a></div></body></html>`)
    expect(job).toMatchObject({ title: 'Warehouse Supervisor', description: `Warehouse Supervisor\n\n${description}\n\nApply` })
    const section = (heading: string, href: string) => `<div class="section"><h2>${heading}</h2><p>${description.slice(0, 300)} <a href="${href}">More</a></p><ul><li>${heading}</li></ul></div>`
    const sections = scrape('https://careers.example.com/jobs/1', `<html><body><main><h1>Warehouse Supervisor</h1><div>
      ${section('About us', '/about')}<div class="section"><h2>The role</h2><p>${description.slice(0, 300)}</p></div>
      ${section('Benefits', '/benefits')}${section('Equal opportunity', '/eeo')}</div></main></body></html>`)
    expect(sections.description).toContain('Equal opportunity')
    const bullets = (heading: string, href: string) => `<div class="section"><h2>${heading}</h2><ul><li>${description.slice(0, 300)} <a href="${href}">More</a></li></ul></div>`
    const bulleted = scrape('https://careers.example.com/jobs/1', `<html><body><main><h1>Warehouse Supervisor</h1><div>
      ${bullets('About us', '/about')}${bullets('The role', '/role')}${bullets('Benefits', '/benefits')}${bullets('Equal opportunity', '/eeo')}</div></main></body></html>`)
    expect(bulleted.description).toContain('Equal opportunity')
    for (const tag of ['div', 'span']) {
      const prose = (heading: string, href: string) => `<div class="sec"><h3>${heading}</h3><${tag}>${description.slice(0, 300)} <a href="${href}">More</a></${tag}></div>`
      const job = scrape('https://careers.example.com/jobs/1', `<html><body><main><h1>Warehouse Supervisor</h1><div>
        ${prose('About us', '/about')}${prose('The role', 'mailto:jobs@example.com')}${prose('Benefits', '/benefits')}</div></main></body></html>`)
      expect(job.description).toContain('Benefits')
    }
    const cta = (heading: string, href: string) => `<div class="sec"><h2>${heading}</h2><p>${description.slice(0, 200)}</p><a href="${href}">Learn more</a></div>`
    const spans = (heading: string, href: string) => `<div class="sec"><h3>${heading}</h3><div><span>${description.slice(0, 250)} </span><a href="${href}">link</a><span> more.</span></div></div>`
    const cookie = `<div class="cookie">${'We use cookies to improve your experience. '.repeat(14)}</div>`
    for (const section of [cta, spans]) {
      const posting = `<main><h1>Warehouse Supervisor</h1><div class="posting"><div class="sec"><h2>The role</h2><p>${description}</p></div>
        ${section('About us', '/about')}${section('Benefits', '/benefits')}${section('Life at Acme', '/life')}</div></main>`
      const meta = posting.replace('</h1>', '</h1><p>Full time · Sydney</p>')
      const unshown = posting.replace('</h1>', '</h1><style>.x{color:red}</style><div hidden>Share this job</div><button><svg><title>Share</title></svg></button>')
      for (const body of [posting, `${posting}${cookie}`, `<div id="app">${posting}${cookie}</div>`, `${meta}${cookie}`, `<div id="app">${unshown}${cookie}</div>`]) {
        const job = scrape('https://careers.example.com/jobs/1', `<html><body>${body}</body></html>`)
        expect(job.description).toMatch(/^(Warehouse Supervisor\n\n)?The role[^]*Life at Acme/)
      }
    }
  })

  // Reading each link once per link it's nested in takes about 34 s here (#74)
  test('70 nested links in 100 nested blocks stay cheap', () => {
    const main = '<div>'.repeat(100) + 'x'.repeat(600) + '<a href="/a">L<div>'.repeat(70) + '<i></i>'.repeat(20_000) + '</div></a>'.repeat(70) + '</div>'.repeat(100)
    const start = performance.now()
    scrape('https://careers.example.com/jobs/1', `<!doctype html><html><body><h1>Clerk</h1><main>${main}</main></body></html>`)
    expect(performance.now() - start).toBeLessThan(5000)
  })

  // Card lists measure each level's text, which costs about as much as the block search here (#215)
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
  // Comments cost a node each though they aren't elements (#3)
  expect(() => scrape('https://careers.example.com/jobs/1', `<html><body>${'<!---->'.repeat(200_000)}</body></html>`)).toThrow('too large')
  // Comparing every pair of 50,000 microdata sections to find the outermost is quadratic (#5)
  const nestedSections = '<div itemprop="description">x</div>'.repeat(50_000)
  const start = performance.now()
  scrape('https://careers.example.com/jobs/1', `<html><body><main itemscope itemtype="https://schema.org/JobPosting"><h1 itemprop="title">Clerk</h1>${nestedSections}</main></body></html>`)
  expect(performance.now() - start).toBeLessThan(2000)
  // Counted before attaching, which recurses once per nested template (#3)
  const nested = '<div><template shadowrootmode="open">'.repeat(300) + 'x' + '</template></div>'.repeat(300)
  expect(() => scrape('https://careers.example.com/jobs/1', `<html><body>${nested}</body></html>`)).toThrow('too large')
})

test('LinkedIn signed-in layout: posting links only, named company, no "… more"', () => {
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

// Pages within the size caps, each built against one loop that once grew faster
// than the page, inside a doctyped page as every snapshot is (snapshot.ts, #21)
const box = (inner = 'a') => `<p><span data-testid="expandable-text-box">${inner}</span></p>`
const deepBox = (inner?: string) => '<div>'.repeat(16) + `<div><h2>About the job</h2>${box(inner)}</div>` + '</div>'.repeat(16)
const companyLink = (slug: string, inner: string) => `<a href="https://www.linkedin.com/company/${slug}/">${inner}</a>`
test('LinkedIn description runs past the list with a hidden sibling above the box', () => {
  const hidden = scrape('https://www.linkedin.com/jobs/view/1/', `<html><body><main><div data-display-contents="true"><p>Senior Data Analyst<span></span></p></div>
    <div><div hidden>${'Hidden note. '.repeat(20)}</div><h2>About the job</h2><p><span data-testid="expandable-text-box">We build widgets.</span></p><ul><li>Ship weekly dashboards</li></ul><p>Join us.</p>
    <button data-testid="expandable-text-button">… more</button></div></main></body></html>`)
  expect(hidden.description).toBe('We build widgets.\n\nShip weekly dashboards\n\nJoin us.')
  // Expanded posting: the button is hidden, so the end is the line after the divider.
  // Hidden siblings don't use up a search, nor end it on text the box shares (#21)
  const expanded = scrape('https://www.linkedin.com/jobs/view/1/', `<html><body><main><div data-display-contents="true"><p>Senior Data Analyst<span></span></p></div>
    <div><h2>About the job</h2><p><span data-testid="expandable-text-box">We offer Medical insurance and a learning budget.</span></p><ul><li>Ship weekly dashboards</li></ul>
    <button data-testid="expandable-text-button" hidden>… more</button><div hidden>Medical insurance</div><div hidden>Apply by Friday</div><p></p><hr><p>Benefits found in job post</p><p>Vision insurance</p></div></main></body></html>`)
  expect(expanded.description).toBe('We offer Medical insurance and a learning budget.\n\nShip weekly dashboards')
})

test.each([
  // A backtracking "… more" regex goes quadratic on long whitespace runs (#21)
  { case: '40,000 line breaks in the box', main: deepBox(`a${'<br>'.repeat(40_000)}b`), company: 'Unknown Company' },
  // Reading links once per level, or ordering them by walking siblings, is quadratic here (#21)
  { case: '29,000 sibling company links', main: deepBox() + Array.from({ length: 29_000 }, (_, i) => companyLink(`c${i}`, `<p>C${i}</p>`)).join(''), company: 'C0' },
  // Comparing every <p> near the company link took 88 s on this page (#21)
  { case: '29,000 paragraphs beside a company link', main: companyLink('c', 'C') + '<p>1 hour ago</p>'.repeat(29_000) + deepBox(), company: 'C' },
  // Judging each title candidate again at each of 12 levels costs 12 times as much (#21)
  { case: '19,000 title candidates beside the box', main: `<div>${'<div data-display-contents="true"><p>1 hour ago</p></div>'.repeat(19_000)}<div>${box()}</div></div>`, company: 'Unknown Company' },
  // Compiling a selector per isUIChrome call, not walking ancestors, is slow at this depth (#21)
  { case: '19,000 title candidates 200 levels deep', main: '<div>'.repeat(200) + `<div>${'<div data-display-contents="true"><p>1 hour ago</p></div>'.repeat(19_000)}<div>${box()}</div></div>` + '</div>'.repeat(200), company: 'Unknown Company' },
  // linkedom lets <a> nest, so reading each link inside a judged link costs links x subtree (#21)
  { case: '120 nested company links', main: `<div>${box()}</div>` + '<a href="https://www.linkedin.com/company/c/">C<div>'.repeat(120) + '<i></i>'.repeat(55_000) + '</div></a>'.repeat(120), company: 'C', work: 1_200_000_000 },
  // linkedom nests <p>, so reading a span that holds a block reads everything below it (#21)
  { case: '80 nested title candidates', main: `<div>${'<div data-display-contents="true"><p><span>'.repeat(80)}${'<i>x</i>'.repeat(55_000)}${'</span></p></div>'.repeat(80)}<div>${box()}</div></div>`, company: 'Unknown Company', work: 1_200_000_000 },
  // Reading each nested "Show more" link whole in the last-resort search costs links x subtree (#21)
  { case: '120 nested "Show more" links', main: `<div>${box()}</div>` + '<a href="https://www.linkedin.com/company/c/">Show more<div>'.repeat(120) + '<i></i>'.repeat(55_000) + '</div></a>'.repeat(120), company: 'Unknown Company', work: 1_200_000_000 },
  // The "(verified job)" regexes backtrack on whitespace: 7 s at 100,000 spaces (#21)
  { case: 'a span candidate with 100,000 spaces', main: `<div><div data-display-contents="true"><p><span>a${' '.repeat(100_000)}b</span></p></div><div>${box()}</div></div>`, company: 'Unknown Company' },
  { case: 'a link candidate with 100,000 spaces', main: `<div><div data-display-contents="true"><p><a href="https://www.linkedin.com/jobs/view/1/">a${' '.repeat(100_000)}b</a></p></div><div>${box()}</div></div>`, company: 'Unknown Company' },
  // JSON can write "<" as \u003c past the tag cap, and a tag-stripping regex can
  // backtrack over a run of them (#21)
  { case: 'JSON-LD with 200,000 "<" and no ">"', main: `<script type="application/ld+json">{"@type":"JobPosting","title":"x","description":"${'\\u003c'.repeat(200_000)}"}</script>`, company: 'Unknown Company' },
  // Leftovers after stripping can pair into tags for the entity decoder, an
  // uncapped DOMParser (#21)
  { case: 'JSON-LD with 100,000 "<<b>div>"', main: `<script type="application/ld+json">{"@type":"JobPosting","title":"x","description":"${'\\u003c\\u003cb>div>'.repeat(100_000)}"}</script>`, company: 'Unknown Company' },
  // lastIndexOf costs text x pattern, so the end marker is capped in length like the start (#21)
  { case: 'a 100,000-character end marker', main: `<div>${box('x')}<ul><li>y</li></ul><button data-testid="expandable-text-button">${'a'.repeat(100_000)}b</button><div>${'a'.repeat(300_000)}</div></div>`, company: 'Unknown Company' },
  // Each missed marker costs text x marker: 10 searches of 80 characters take over
  // a second on 3.9 MB (#21)
  { case: 'twelve hidden end markers after 3.9 MB', main: `<div>${box('a'.repeat(3_900_000))}<ul><li>y</li></ul><hr>${`<div hidden>${'a'.repeat(79)}b</div>`.repeat(12)}</div>`, company: 'Unknown Company', limit: 600 },
  // linkedom's `:scope >` selectors scan each nested candidate's whole subtree (#21)
  { case: '120 nested <p><span> beside a company link', main: companyLink('c', 'C') + '<p><span>'.repeat(120) + '<i></i>'.repeat(55_000) + '</span></p>'.repeat(120) + deepBox(), company: 'C', work: 1_200_000_000 },
  // Deep-copying each nested template's .content costs levels x subtree, 4 s here,
  // so a tighter limit (#21)
  { case: '60 nested shadow roots', main: deepBox() + '<div><template shadowrootmode="open">'.repeat(60) + '<i></i>'.repeat(40_000) + '</template></div>'.repeat(60), company: 'Unknown Company', limit: 1500 },
])('LinkedIn pages built to cost work stay cheap: $case', ({ main, company, limit = 5000, work = Infinity }) => {
  const meter = { work: 0 }
  const start = performance.now()
  const job = scrapeHtml(parseHTML, 'https://www.linkedin.com/jobs/view/1/', `<!doctype html><html><body><main>${main}</main></body></html>`, meter)
  expect(performance.now() - start).toBeLessThan(limit) // slow versions took 1.2 to 200+ s; CI runners are slower than a laptop (#322)
  // Work, not time, where the slow path reads whole subtrees: it adds about 2.6B,
  // and a busy machine can't fail it (#322)
  expect(meter.work).toBeLessThan(work)
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
  // The describe body runs even when the suite is skipped, so browsers launch in beforeAll (#2)
  let browser: Awaited<ReturnType<typeof launchBrowsers>>
  beforeAll(async () => { browser = await launchBrowsers() })
  afterAll(() => browser?.close())

  // Fixtures can't show this: signed-in LinkedIn puts the job pane in an open
  // shadow root, which the snapshot must carry (#3)
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

  // Retried: LinkedIn sometimes serves a runner's IP an empty page, and a real
  // markup change fails every attempt (#18). Indeed needs a visible Chrome and
  // blocks IPs after a few visits, so it isn't scheduled (#2)
  test.each(BOARDS.filter((b) => !b.headed))('$name', { timeout: 120_000, retry: 2 }, async (board) => {
    const { url, html } = await fetchPosting(browser, board)
    const job = scrape(url, html)
    expect(job.title, url).not.toBe('')
    expect(job.company, url).not.toBe('Unknown Company')
    expect(job.description.length, url).toBeGreaterThan(500)
  })
})
