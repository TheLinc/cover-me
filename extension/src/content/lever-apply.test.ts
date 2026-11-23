import { parseHTML } from 'linkedom'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { addLeverPostingJsonLd } from './lever-apply'

const POSTING = `<html><head><script type="application/ld+json">{"@type":"JobPosting","title":"Analyst","description":"<p>Intro only</p>"}</script></head><body>
  <div class="section page-centered posting-header"><h2>Analyst</h2></div>
  <div class="section page-centered"><p>Intro</p></div>
  <div class="section page-centered"><p>Closing notice</p></div>
  <div class="section page-centered last-section-apply"><a>Apply</a></div>
</body></html>`

function openPage(url: string) {
  const { document, DOMParser } = parseHTML('<html><head></head><body></body></html>')
  const fetch = vi.fn(async () => new Response(POSTING))
  vi.stubGlobal('location', new URL(url))
  vi.stubGlobal('document', document)
  vi.stubGlobal('DOMParser', DOMParser)
  vi.stubGlobal('fetch', fetch)
  return { document, fetch }
}

const copied = (document: Document) => document.querySelectorAll('script[data-cover-me-posting]')

describe('addLeverPostingJsonLd', () => {
  afterEach(() => vi.unstubAllGlobals())

  test('copies the posting page JSON-LD into a Lever apply page, once', async () => {
    const { document, fetch } = openPage('https://jobs.lever.co/acme/1a2b/apply?source=LinkedIn')
    await addLeverPostingJsonLd()
    await addLeverPostingJsonLd()
    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch.mock.calls[0]).toEqual(['https://jobs.lever.co/acme/1a2b', expect.anything()])
    expect(copied(document)).toHaveLength(1)
    const ld = JSON.parse(copied(document)[0].textContent!)
    expect(ld).toMatchObject({ title: 'Analyst', description: '<p>Intro</p><p>Closing notice</p>' })
  })

  test.each([
    'https://jobs.lever.co/acme/1a2b',
    'https://jobs.lever.co/acme',
    'https://jobs.ashbyhq.com/acme/1a2b/apply',
    'https://notlever.co/acme/1a2b/apply',
  ])('leaves %s alone', async (url) => {
    const { document, fetch } = openPage(url)
    await addLeverPostingJsonLd()
    expect(fetch).not.toHaveBeenCalled()
    expect(copied(document)).toHaveLength(0)
  })

  test('adds nothing when the posting page fails to load', async () => {
    const { document, fetch } = openPage('https://jobs.lever.co/acme/1a2b/apply')
    fetch.mockResolvedValueOnce(new Response('gone', { status: 404 }))
    await addLeverPostingJsonLd()
    expect(copied(document)).toHaveLength(0)
  })
})
