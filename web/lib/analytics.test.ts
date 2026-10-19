import { describe, expect, it } from 'vitest'
import type { CaptureResult } from 'posthog-js'
import { cleanUrl, isPrivatePath, scrubEvent } from './analytics'

const event = (properties: Record<string, unknown>) =>
  ({ uuid: 'u', event: '$pageview', properties }) as CaptureResult

describe('scrubEvent', () => {
  it('drops every event from a signed-in page', () => {
    for (const path of ['/dashboard', '/dashboard/applications', '/auth', '/upgraded', '/api/checkout']) {
      expect(scrubEvent(event({ $pathname: path }))).toBeNull()
    }
  })

  it('keeps public pages, including ones that only start like a private path', () => {
    expect(isPrivatePath('/')).toBe(false)
    expect(isPrivatePath('/authors')).toBe(false)
    expect(scrubEvent(event({ $pathname: '/for/linkedin' }))).not.toBeNull()
  })

  it('keeps utm tags and strips everything else from URLs', () => {
    const out = scrubEvent(event({
      $pathname: '/',
      $current_url: 'https://www.cover-me.dev/?utm_source=reddit&utm_campaign=launch&code=secret#access_token=x',
      $referrer: 'https://www.google.com/search?q=cover+letter',
    }))
    expect(out?.properties.$current_url).toBe('https://www.cover-me.dev/?utm_source=reddit&utm_campaign=launch')
    expect(out?.properties.$referrer).toBe('https://www.google.com/search')
  })

  it('removes the previous page when it was a signed-in one', () => {
    const out = scrubEvent(event({
      $pathname: '/',
      $prev_pageview_pathname: '/dashboard/applications',
      $prev_pageview_url: 'https://www.cover-me.dev/dashboard/applications?id=1',
      $prev_pageview_duration: 12,
    }))
    expect(Object.keys(out!.properties).filter((k) => k.startsWith('$prev_pageview_'))).toEqual([])
  })

  it('passes non-URL values through', () => {
    expect(cleanUrl('$direct')).toBe('$direct')
    expect(cleanUrl(undefined)).toBeUndefined()
  })
})
