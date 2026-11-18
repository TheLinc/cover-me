import { existsSync, readFileSync } from 'node:fs'
import { createElement as h } from 'react'
import { describe, expect, it } from 'vitest'
import { GUIDES, readingMinutes, slugify } from './guides'

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

  it("counts a guide prompt's prompt, answer and check", () => {
    const Prompt = () => null
    const step = h(Prompt, { prompt: words(230), answer: words(230), check: h('em', null, 'one') })
    expect(readingMinutes(step)).toBe(3)
  })

  it('never shows less than one minute', () => {
    expect(readingMinutes(h('p', null, 'Short.'))).toBe(1)
    expect(readingMinutes(null)).toBe(1)
  })
})

describe('GUIDES', () => {
  const llms = readFileSync('public/llms.txt', 'utf8')

  it.each(GUIDES.map((g) => g.slug))('%s has a page and a line in llms.txt', (slug) => {
    expect(existsSync(`app/guides/${slug}/page.tsx`)).toBe(true)
    expect(llms).toContain(`https://www.cover-me.dev/guides/${slug})`)
  })
})
