import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { jsonLdApp } from '@/lib/structured-data'
import { ClosingCta } from './ClosingCta'

describe('ClosingCta', () => {
  const html = renderToStaticMarkup(h(ClosingCta))
  const link = html.match(/<a href="([^"]+)"[^>]*>((?:(?!<\/a>).)*?\d\.\d on the Chrome Web Store)<\/a>/)
  const text = link?.[2].replace(/<[^>]+>/g, '')

  it('shows the store rating the homepage marks up, so Google sees it on the page', () => {
    expect(text).toBe('5.0 on the Chrome Web Store')
    expect(text).toContain(jsonLdApp(null).aggregateRating.ratingValue.toFixed(1))
  })

  it('links the rating to the store listing, where the count is', () => {
    const url = new URL(link![1].replaceAll('&amp;', '&'))
    expect(url.pathname).toBe('/detail/cover-me-ai-resume-tailor/bpbnopjgjbimdjjdolhkgimllbgamgpi')
    expect(url.searchParams.get('utm_campaign')).toBe('closing-rating')
  })

  it('leaves the rating count off the page', () => {
    expect(html.replace(/<[^>]+>/g, ' ')).not.toMatch(/\d+ ratings?/)
  })
})
