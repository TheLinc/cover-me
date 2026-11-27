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
    openPage('https://www.linkedin.com/jobs/view/101', ld({ '@type': 'JobPosting', hiringOrganization: { name: 'Fernbrook Analytics', logo: 'https://media.licdn.com/fernbrook.png' } }))
    expect(postingLogo('Fernbrook Analytics')).toBe('https://media.licdn.com/fernbrook.png')

    openPage('https://jobs.lever.co/fernbrook/42', ld({ '@graph': [{ '@type': 'Organization' }, { '@type': ['JobPosting'], hiringOrganization: { logo: { '@type': 'ImageObject', url: 'https://lever-client-logos.s3.amazonaws.com/f.png' } } }] }))
    expect(postingLogo('Fernbrook Analytics')).toBe('https://lever-client-logos.s3.amazonaws.com/f.png')
  })

  test('reads a microdata logo', () => {
    openPage('https://jobs.smartrecruiters.com/Fernbrook/42', '', '<div itemscope itemtype="http://schema.org/JobPosting"><div itemprop="hiringOrganization" itemscope><meta itemprop="name" content="Fernbrook"><meta itemprop="logo" content="https://c.smartrecruiters.com/fernbrook/huge"></div></div>')
    expect(postingLogo('Fernbrook')).toBe('https://c.smartrecruiters.com/fernbrook/huge')
  })

  test("takes Greenhouse's and Workday's employer logo from the share image, not other boards'", () => {
    openPage('https://job-boards.greenhouse.io/fernbrook/jobs/4821', '<meta property="og:image" content="https://s8-recruiting.cdn.greenhouse.io/external_greenhouse_job_boards/logos/400/040/original/fernbrook.png?1">')
    expect(postingLogo('Fernbrook Analytics')).toBe('https://s8-recruiting.cdn.greenhouse.io/external_greenhouse_job_boards/logos/400/040/original/fernbrook.png?1')

    openPage('https://fernbrook.wd5.myworkdayjobs.com/en-US/Careers/job/42', '<meta property="og:image" content="https://fernbrook.wd5.myworkdayjobs.com/en-US/Careers/assets/logo">')
    expect(postingLogo('Fernbrook Analytics')).toBe('https://fernbrook.wd5.myworkdayjobs.com/en-US/Careers/assets/logo')

    openPage('https://www.indeed.com/viewjob?jk=1', '<meta property="og:image" content="https://socialmediaimages.indeed.com/job/g3/1.png">' + ICONS)
    expect(postingLogo('Fernbrook Analytics')).toBeUndefined()
  })

  test("uses the site's own icon on the company's own careers site, the larger one first", () => {
    openPage('https://jobs.apple.com/en-us/details/42', ICONS)
    expect(postingLogo('Apple')).toBe('https://jobs.apple.com/touch-icon.png')

    openPage('https://www.amazon.jobs/en/jobs/42', '<link rel="shortcut icon" href="https://assets.amazon.jobs/favicon.ico">')
    expect(postingLogo('Amazon.com Services LLC')).toBe('https://assets.amazon.jobs/favicon.ico')

    openPage('https://careers.homedepot.com/job/42', ICONS)
    expect(postingLogo('The Home Depot')).toBe('https://careers.homedepot.com/touch-icon.png')
  })

  test("never uses a job board's or another company's site icon", () => {
    openPage('https://job-boards.greenhouse.io/fernbrook/jobs/4821', ICONS)
    expect(postingLogo('Fernbrook Analytics')).toBeUndefined()

    openPage('https://builtin.com/job/platform-engineer/42', ICONS)
    expect(postingLogo('Fernbrook Analytics')).toBeUndefined()
  })

  test('keeps only https images', () => {
    openPage('https://careers.fernbrook.com/42', ld({ '@type': 'JobPosting', hiringOrganization: { logo: 'http://cdn.fernbrook.com/logo.png' } }) + '<link rel="icon" href="data:image/png;base64,AAAA">')
    expect(postingLogo('Fernbrook')).toBeUndefined()
  })
})
