import { describe, expect, test } from 'vitest'
import { BOARDS } from '../../../web/lib/boards.ts'
import { SUPPORTED_SITES, isSupportedHost } from '../content/scrapers/index.ts'
import { scrapeFailure } from './scrape-failure.ts'

describe('supported sites', () => {
  // The website advertises these boards; a board missing here would get the
  // "we can't read it yet" screen instead of a bug report.
  test.each(BOARDS.map((b) => b.slug))('lists %s, advertised on the website', (slug) => {
    expect(SUPPORTED_SITES).toHaveProperty(slug)
  })

  test('matches subdomains by suffix, not by substring', () => {
    expect(isSupportedHost('ca.linkedin.com')).toBe(true)
    expect(isSupportedHost('acme.wd5.myworkdayjobs.com')).toBe(true)
    expect(isSupportedHost('linkedin.com')).toBe(true)
    expect(isSupportedHost('notlinkedin.com')).toBe(false)
    expect(isSupportedHost('linkedin.com.example.org')).toBe(false)
  })
})

describe('scrapeFailure', () => {
  const error = 'Could not read this page.'

  test('a site we have no scraper for is unsupported, keyed by its host without www.', () => {
    expect(scrapeFailure('https://www.acme-careers.com/jobs/42?ref=x', ['https://www.acme-careers.com/jobs/42?ref=x'], error))
      .toEqual({ reason: 'unsupported', host: 'acme-careers.com', error })
  })

  test('a supported board that failed is a bug, with the full URL and the scraper that ran', () => {
    const url = 'https://www.linkedin.com/jobs/search/?currentJobId=123'
    expect(scrapeFailure(url, [url], error))
      .toEqual({ reason: 'failed', host: 'linkedin.com', url, scraper: 'linkedin', error })
  })

  test('an embedded board frame that failed is a bug about that frame', () => {
    const frame = 'https://job-boards.greenhouse.io/embed/job_app?token=9'
    expect(scrapeFailure('https://acme.com/careers', ['https://acme.com/careers', frame], error))
      .toEqual({ reason: 'failed', host: 'job-boards.greenhouse.io', url: frame, scraper: 'generic', error })
  })

  test('the frame that raised the error wins over other supported frames', () => {
    const lever = 'https://jobs.lever.co/acme/1'
    const ashby = 'https://jobs.ashbyhq.com/acme/2'
    expect(scrapeFailure('https://acme.com/', ['https://acme.com/', ashby, lever], error, lever))
      .toMatchObject({ reason: 'failed', url: lever, scraper: 'lever' })
  })

  test.each([
    ['chrome://extensions/', ['chrome://extensions/']],
    ['chrome://newtab/', []],
    ['file:///C:/jobs/posting.html', ['file:///C:/jobs/posting.html']],
    ['https://acme.com/posting.pdf', ['https://acme.com/posting.pdf']],
    // Pages Chrome won't let an extension script (the PDF viewer, the Web Store)
    ['https://chromewebstore.google.com/detail/x', []],
    [undefined, []],
  ])('%s is not a web page', (tab, frames) => {
    expect(scrapeFailure(tab, frames, error)).toMatchObject({ reason: 'not_web' })
  })
})
