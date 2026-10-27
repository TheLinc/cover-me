import { describe, expect, it } from 'vitest'
import { changedUrls } from './indexnow.mjs'

const xml = `<urlset>
<url><loc>https://www.cover-me.dev</loc><lastmod>2026-10-25</lastmod></url>
<url><loc>https://www.cover-me.dev/about</loc><lastmod>2026-06-23</lastmod></url>
<url><loc>https://www.cover-me.dev/guides/x</loc><lastmod>2026-10-20T08:00:00.000Z</lastmod></url>
<url><loc>https://www.cover-me.dev/no-date</loc></url>
</urlset>`
const now = new Date('2026-10-27T12:00:00Z')

describe('changedUrls', () => {
  it('keeps pages modified in the last 7 days, including the boundary day', () => {
    expect(changedUrls(xml, { now })).toEqual([
      'https://www.cover-me.dev',
      'https://www.cover-me.dev/guides/x',
    ])
  })

  it('returns every page with --all', () => {
    expect(changedUrls(xml, { all: true, now })).toHaveLength(4)
  })
})
