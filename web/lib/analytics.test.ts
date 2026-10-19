import { describe, expect, it } from 'vitest'
import type { CaptureResult } from 'posthog-js'
import { cleanUrl, isPrivatePath, scrubEvent, storeClick } from './analytics'

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

describe('storeClick', () => {
  // Enough of an element for closest('a[href]') and the label
  const link = (href: string, text: string | null, ariaLabel?: string) => {
    const a = {
      textContent: text,
      getAttribute: (name: string) => (name === 'href' ? href : name === 'aria-label' ? ariaLabel ?? null : null),
    }
    return { closest: () => a } as unknown as Element
  }
  const STORE = 'https://chromewebstore.google.com/detail/cover-me/bpbnopjgjbimdjjdolhkgimllbgamgpi'

  it('records a click on a store link with its label', () => {
    expect(storeClick({ type: 'click', button: 0, target: link(STORE, '  Add to\n Chrome  ') })).toEqual({ link_text: 'Add to Chrome' })
  })

  it('uses the label on screen when the link holds a hidden one too', () => {
    const a = { innerText: 'Install', textContent: 'Add to Chrome, freeInstall', getAttribute: () => STORE }
    expect(storeClick({ type: 'click', button: 0, target: { closest: () => a } as unknown as Element })).toEqual({ link_text: 'Install' })
  })

  it('falls back to aria-label for an icon-only link', () => {
    expect(storeClick({ type: 'click', button: 0, target: link(STORE, '', 'Install Cover Me') })).toEqual({ link_text: 'Install Cover Me' })
  })

  it('counts middle clicks but not right clicks', () => {
    expect(storeClick({ type: 'auxclick', button: 1, target: link(STORE, 'Install') })).not.toBeNull()
    expect(storeClick({ type: 'auxclick', button: 2, target: link(STORE, 'Install') })).toBeNull()
  })

  it('ignores other links and clicks outside links', () => {
    expect(storeClick({ type: 'click', button: 0, target: link('https://github.com/TheLinc/cover-me', 'GitHub') })).toBeNull()
    expect(storeClick({ type: 'click', button: 0, target: { closest: () => null } as unknown as Element })).toBeNull()
    expect(storeClick({ type: 'click', button: 0, target: null })).toBeNull()
  })
})
