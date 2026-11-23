import { describe, expect, it } from 'vitest'
import { phoneSendUrl, sentFrom } from './phone-send'

describe('phoneSendUrl', () => {
  it('links back to the same page, tagged with the placement', () => {
    expect(phoneSendUrl('https://www.cover-me.dev/guides/ats', 'hero')).toBe(
      'https://www.cover-me.dev/guides/ats?utm_source=share&utm_medium=phone&utm_campaign=hero-phone-send',
    )
  })
})

describe('sentFrom', () => {
  it('returns the campaign of a link sent from a phone', () => {
    expect(sentFrom('?utm_source=share&utm_medium=phone&utm_campaign=nav-phone-send')).toBe('nav-phone-send')
    expect(sentFrom(new URL(phoneSendUrl('https://www.cover-me.dev/ats-checker', 'ats')).search)).toBe('ats-phone-send')
  })

  it('ignores every other visit', () => {
    expect(sentFrom('')).toBeNull()
    expect(sentFrom('?utm_campaign=hero')).toBeNull()
    expect(sentFrom('?utm_campaign=-phone-send')).toBeNull()
    expect(sentFrom('?utm_campaign=phone-send-later')).toBeNull()
  })
})
