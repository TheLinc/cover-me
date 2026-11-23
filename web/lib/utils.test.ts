import { describe, expect, it } from 'vitest'
import { CHROME_STORE_URL, storeUrl } from './utils'

describe('storeUrl', () => {
  it('tags the listing with the site as source and the placement as campaign', () => {
    expect(storeUrl('hero')).toBe(
      'https://chromewebstore.google.com/detail/cover-me-ai-resume-tailor/bpbnopjgjbimdjjdolhkgimllbgamgpi?utm_source=cover-me.dev&utm_medium=site&utm_campaign=hero',
    )
  })

  it('leaves the listing path alone and the clean URL untouched', () => {
    const url = new URL(storeUrl('for-board'))
    expect(url.origin + url.pathname).toBe(CHROME_STORE_URL)
    expect(url.searchParams.get('utm_campaign')).toBe('for-board')
    expect(CHROME_STORE_URL).not.toContain('?')
  })
})
