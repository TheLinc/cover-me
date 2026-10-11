import { describe, expect, it } from 'vitest'
import { avatarUrl } from './avatar'

describe('avatarUrl', () => {
  it("uses the picture Google sends with a Google sign-in", () => {
    expect(avatarUrl({ avatar_url: 'https://lh3.googleusercontent.com/a/abc=s96-c' })).toBe('https://lh3.googleusercontent.com/a/abc=s96-c')
    expect(avatarUrl({ picture: 'https://lh3.googleusercontent.com/a/xyz' })).toBe('https://lh3.googleusercontent.com/a/xyz')
  })
  it('is null for email sign-ins and anything that is not https', () => {
    expect(avatarUrl({})).toBeNull()
    expect(avatarUrl(undefined)).toBeNull()
    expect(avatarUrl({ avatar_url: 'http://example.com/a.png' })).toBeNull()
    expect(avatarUrl({ avatar_url: 'javascript:alert(1)' })).toBeNull()
    expect(avatarUrl({ avatar_url: 42 })).toBeNull()
  })
})
