import { parseHTML } from 'linkedom'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { postingLogo } from './logo'

function openPage(url: string, head: string, body = '') {
  const { document } = parseHTML(`<html><head>${head}</head><body>${body}</body></html>`)
  vi.stubGlobal('location', new URL(url))
  vi.stubGlobal('document', document)
}

const ld = (posting: unknown) => `<script type="application/ld+json">${JSON.stringify(posting)}</script>`
const ICONS = '<link rel="icon" href="/favicon.ico"><link rel="apple-touch-icon" href="/touch-icon.png">'

describe('postingLogo', () => {
  afterEach(() => vi.unstubAllGlobals())

  test('reads the posting data logo, as a URL or an image object, in an @graph too', () => {
    openPage('https://www.linkedin.com/jobs/view/101', ld({ '@type': 'JobPosting', hiringOrganization: { name: 'Fernbrook Analytics, Inc.', logo: 'https://media.licdn.com/fernbrook.png' } }))
    expect(postingLogo('Fernbrook Analytics')).toBe('https://media.licdn.com/fernbrook.png')

    openPage('https://jobs.lever.co/fernbrook/42', ld({ '@graph': [{ '@type': 'Organization' }, { '@type': ['JobPosting'], hiringOrganization: { logo: { '@type': 'ImageObject', url: 'https://lever-client-logos.s3.amazonaws.com/f.png' } } }] }))
    expect(postingLogo('Fernbrook Analytics')).toBe('https://lever-client-logos.s3.amazonaws.com/f.png')
  })

  test("skips another company's posting on the page, and an http logo, for the next one", () => {
    openPage('https://careers.fernbrook.com/42', ld([
      { '@type': 'JobPosting', hiringOrganization: { name: 'Quarry Labs', logo: 'https://cdn.quarry.com/logo.png' } },
      { '@type': 'JobPosting', hiringOrganization: { name: 'Fernbrook', logo: 'http://cdn.fernbrook.com/logo.png' } },
      { '@type': 'JobPosting', hiringOrganization: { name: 'Fernbrook', logo: 'https://cdn.fernbrook.com/logo.png' } },
    ]))
    expect(postingLogo('Fernbrook')).toBe('https://cdn.fernbrook.com/logo.png')
  })

  test('reads a microdata logo', () => {
    openPage('https://jobs.smartrecruiters.com/Fernbrook/42', '', '<div itemscope itemtype="http://schema.org/JobPosting"><div itemprop="hiringOrganization" itemscope><meta itemprop="name" content="Fernbrook"><meta itemprop="logo" content="https://c.smartrecruiters.com/fernbrook/huge"></div></div>')
    expect(postingLogo('Fernbrook')).toBe('https://c.smartrecruiters.com/fernbrook/huge')

    openPage('https://careers.example.org/42', '', '<div itemscope itemtype="https://schema.org/JobPosting"><div itemprop="hiringOrganization" itemscope><img itemprop="logo" src="https://cdn.example.org/fernbrook.png"></div></div>')
    expect(postingLogo('Fernbrook')).toBe('https://cdn.example.org/fernbrook.png')
  })

  test("takes Greenhouse's and Workday's employer logo from the share image, not other boards'", () => {
    openPage('https://job-boards.greenhouse.io/fernbrook/jobs/4821', '<meta property="og:image" content="https://s8-recruiting.cdn.greenhouse.io/external_greenhouse_job_boards/logos/400/040/original/fernbrook.png?1">')
    expect(postingLogo('Fernbrook Analytics')).toBe('https://s8-recruiting.cdn.greenhouse.io/external_greenhouse_job_boards/logos/400/040/original/fernbrook.png?1')

    openPage('https://fernbrook.wd5.myworkdayjobs.com/en-US/Careers/job/42', '<meta property="og:image" content="https://fernbrook.wd5.myworkdayjobs.com/en-US/Careers/assets/logo">')
    expect(postingLogo('Fernbrook Analytics')).toBe('https://fernbrook.wd5.myworkdayjobs.com/en-US/Careers/assets/logo')

    openPage('https://www.indeed.com/viewjob?jk=1', '<meta property="og:image" content="https://socialmediaimages.indeed.com/job/g3/1.png">' + ICONS)
    expect(postingLogo('Fernbrook Analytics')).toBeUndefined()
  })

  test("takes signed-in LinkedIn's logo image named for the company, not a related job's", () => {
    const img = (alt: string, id: string) => `<img alt="${alt}" src="https://media.licdn.com/dms/image/v2/${id}/company-logo_100_100/0/1/logo?e=1797465600">`
    openPage('https://www.linkedin.com/jobs/search-results/?currentJobId=101', '', img('', 'related') + img('Company logo for, Fernbrook Analytics Group.', 'group') + img('Company logo for, Fernbrook Analytics.', 'fernbrook'))
    expect(postingLogo('Fernbrook Analytics')).toBe('https://media.licdn.com/dms/image/v2/fernbrook/company-logo_100_100/0/1/logo?e=1797465600')
    expect(postingLogo('Northwind Labs')).toBeUndefined()
    expect(postingLogo('Any')).toBeUndefined()
  })

  test("uses the site's own icon on the company's own careers site, the larger one first", () => {
    openPage('https://jobs.apple.com/en-us/details/42', ICONS)
    expect(postingLogo('Apple')).toBe('https://jobs.apple.com/touch-icon.png')

    openPage('https://www.amazon.jobs/en/jobs/42', '<link rel="shortcut icon" href="https://assets.amazon.jobs/favicon.ico">')
    expect(postingLogo('Amazon.com Services LLC')).toBe('https://assets.amazon.jobs/favicon.ico')

    openPage('https://careers.homedepot.com/job/42', ICONS)
    expect(postingLogo('The Home Depot')).toBe('https://careers.homedepot.com/touch-icon.png')

    openPage('https://www.metacareers.com/jobs/42', ICONS)
    expect(postingLogo('Meta Platforms')).toBe('https://www.metacareers.com/touch-icon.png')
  })

  test("never uses a job board's or another company's site icon", () => {
    openPage('https://job-boards.greenhouse.io/fernbrook/jobs/4821', ICONS)
    expect(postingLogo('Fernbrook Analytics')).toBeUndefined()

    openPage('https://builtin.com/job/platform-engineer/42', ICONS)
    expect(postingLogo('Fernbrook Analytics')).toBeUndefined()
    expect(postingLogo('Built Technologies')).toBeUndefined()

    openPage('https://www.glassdoor.com/job-listing/42', ICONS)
    expect(postingLogo('Glass Lewis')).toBeUndefined()
  })

  test('keeps only https images', () => {
    openPage('https://careers.fernbrook.com/42', ld({ '@type': 'JobPosting', hiringOrganization: { logo: 'http://cdn.fernbrook.com/logo.png' } }) + '<link rel="icon" href="data:image/png;base64,AAAA">')
    expect(postingLogo('Fernbrook')).toBeUndefined()
  })
})
