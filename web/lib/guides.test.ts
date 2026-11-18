import { createElement as h } from 'react'
import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { GUIDES, newestFirst, readingMinutes, slugify } from './guides'

describe('slugify', () => {
  it('turns a guide heading into a stable anchor id', () => {
    expect(slugify('What counts as a good ATS score?')).toBe('what-counts-as-a-good-ats-score')
    expect(slugify('Cover Me vs Teal: a cheaper Teal+ alternative')).toBe('cover-me-vs-teal-a-cheaper-teal-alternative')
    expect(slugify('3 resume layouts that broke a real ATS')).toBe('3-resume-layouts-that-broke-a-real-ats')
    expect(slugify('What’s free, and what isn’t')).toBe('whats-free-and-what-isnt')
  })
})

describe('readingMinutes', () => {
  const words = (n: number) => Array(n).fill('word').join(' ')

  it('counts words in nested elements at 230 a minute, rounded up', () => {
    const body = [
      h('p', { key: 1 }, words(200), h('a', { href: '#' }, words(30))),
      h('ul', { key: 2 }, h('li', null, words(229)), h('li', null, h('strong', null, 'one'))),
    ]
    expect(readingMinutes(body)).toBe(2)
    expect(readingMinutes([body, 'two'])).toBe(3)
  })

  it('never shows less than one minute', () => {
    expect(readingMinutes(h('p', null, 'Short.'))).toBe(1)
    expect(readingMinutes(null)).toBe(1)
  })
})

describe('newestFirst', () => {
  const guide = (slug: string, date: string, updated?: string) => ({ slug, date, updated })

  it('orders by last update, newest first, and a newer publish date wins a tie', () => {
    const guides = [
      guide('old', '2026-07-06', '2026-10-29'),
      guide('updated-late', '2026-10-29', '2026-11-09'),
      guide('never-updated', '2026-10-31'),
      guide('published-late', '2026-11-09'),
    ]
    expect(newestFirst(guides).map((g) => g.slug)).toEqual(['published-late', 'updated-late', 'never-updated', 'old'])
  })

  it('returns a copy and leaves the input in its order', () => {
    const guides = [guide('a', '2026-01-01'), guide('b', '2026-02-01')]
    newestFirst(guides)
    expect(guides.map((g) => g.slug)).toEqual(['a', 'b'])
  })
})

describe('GUIDES', () => {
  it.each(GUIDES.map((g) => [g.slug, g] as const))('%s has a hero image in public/ and alt text', (_, g) => {
    expect(existsSync(join(__dirname, '../public', g.image))).toBe(true)
    expect(g.imageAlt.length).toBeGreaterThan(20)
  })
})
