import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement as h } from 'react'
import type { Metadata } from 'next'
import { describe, expect, it, vi } from 'vitest'
import { GUIDES, newestFirst, readingMinutes, slugify } from './guides'

vi.mock('next/font/google', () => ({ Source_Serif_4: () => ({ className: '' }) }))

describe('slugify', () => {
  it('turns a guide heading into a stable anchor id', () => {
    expect(slugify('What counts as a good ATS score?')).toBe('what-counts-as-a-good-ats-score')
    expect(slugify('Is Teal+ worth it? A Teal review')).toBe('is-teal-worth-it-a-teal-review')
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
  const llms = readFileSync(join(__dirname, '../public/llms.txt'), 'utf8')

  it.each(GUIDES.map((g) => g.slug))('%s has a page and a line in llms.txt', (slug) => {
    expect(existsSync(join(__dirname, '../app/guides', slug, 'page.tsx'))).toBe(true)
    expect(llms).toContain(`https://www.cover-me.dev/guides/${slug})`)
  })

  it.each(GUIDES.map((g) => [g.slug, g] as const))('%s has a hero image in public/ and alt text', (_, g) => {
    expect(existsSync(join(__dirname, '../public', g.image))).toBe(true)
    expect(g.imageAlt.length).toBeGreaterThan(20)
  })

  it.each(GUIDES.map((g) => [g.slug, g] as const))('%s has a page title that differs from its H1', async (slug, g) => {
    const { metadata } = (await import(`../app/guides/${slug}/page.tsx`)) as { metadata: Metadata }
    const t = metadata.title
    const title = typeof t === 'string' ? t : t && 'absolute' in t ? t.absolute : undefined
    expect(title).toBeTruthy()
    const plain = (s: string) => s.replace(/ \| Cover Me$/, '').toLowerCase()
    expect(plain(title!)).not.toBe(plain(g.title))
  }, 20_000)
})

describe('moved guides', () => {
  it.each(['aiapply', 'jobscan', 'teal'])('the old %s comparison redirects permanently to its review', async (tool) => {
    const { default: config } = await import('../next.config')
    const redirects = (await config.redirects?.()) ?? []
    const to = `${tool}-review`
    expect(redirects).toContainEqual({ source: `/guides/cover-me-vs-${tool}`, destination: `/guides/${to}`, permanent: true })
    expect(GUIDES.map((g) => g.slug)).toContain(to)
  }, 20_000)
})

describe('internal links', () => {
  const root = join(__dirname, '..')
  const files = ['app', 'components']
    .flatMap((dir) => readdirSync(join(root, dir), { recursive: true, encoding: 'utf8' }).map((f) => join(dir, f)))
    .filter((f) => f.endsWith('.tsx'))
    .map((file) => ({ file, text: readFileSync(join(root, file), 'utf8') }))

  it.each(['aiapply-review', 'free-jobscan-alternatives', 'use-your-own-api-key-for-cover-letters', 'jobright-review', 'how-to-answer-job-application-questions'])(
    '%s is linked from at least two other pages, besides the /guides index',
    (slug) => {
      const own = join('app', 'guides', slug, 'page.tsx')
      const linking = files.filter(({ file, text }) => file !== own && text.includes(`href="/guides/${slug}"`))
      expect(linking.length).toBeGreaterThanOrEqual(2)
    },
  )
})

describe('the application questions guide', () => {
  const slug = 'how-to-answer-job-application-questions'

  it('has one FAQ entry for each question it covers', async () => {
    const { renderToStaticMarkup } = await import('react-dom/server')
    const { default: Page } = await import(`../app/guides/${slug}/page.tsx`)
    const html = renderToStaticMarkup(h(Page))
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]))
    const faq = blocks.find((b) => b['@type'] === 'FAQPage')
    expect(faq.mainEntity.map((q: { name: string }) => q.name)).toEqual([
      'How do you answer "Why are you interested in this position?"',
      'How do you answer "Why do you want to work here?"',
      'How do you answer "Tell us about yourself" on a job application?',
      'What should you put for desired salary on a job application?',
      'What should you put for reason for leaving on a job application?',
    ])
  }, 20_000)

  it('never calls answers autofill or auto-apply (#305)', () => {
    const source = readFileSync(join(__dirname, '../app/guides', slug, 'page.tsx'), 'utf8')
    expect(source).not.toMatch(/autofill|auto-apply/i)
  })
})
