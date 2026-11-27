import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement as h } from 'react'
import type { Metadata } from 'next'
import { describe, expect, it, vi } from 'vitest'
import JSZip from 'jszip'
import { ATS_RESUME_TEMPLATE } from './ats-resume-template'
import { GUIDES, newestFirst, readingMinutes, slugify } from './guides'
import { buildResumeDocx } from './pdf/resume-docx'

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

  it.each(GUIDES.map((g) => g.slug))('%s is in the sitemap', async (slug) => {
    const { default: sitemap } = await import('../app/sitemap')
    expect(sitemap().map((e) => e.url)).toContain(`https://www.cover-me.dev/guides/${slug}`)
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

  it.each(['aiapply-review', 'free-jobscan-alternatives', 'use-your-own-api-key-for-cover-letters', 'jobright-review', 'how-to-answer-job-application-questions', 'careerflow-review', 'best-ai-for-resume-tailoring'])(
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

describe('the Workday application status guide', () => {
  const slug = 'workday-application-status'
  const render = async () => {
    const { renderToStaticMarkup } = await import('react-dom/server')
    const { default: Page } = await import(`../app/guides/${slug}/page.tsx`)
    return renderToStaticMarkup(h(Page))
  }

  it('has one H1 naming "Workday application status" and a full page title under 60 characters', async () => {
    const html = await render()
    const h1s = [...html.matchAll(/<h1[^>]*>(.*?)<\/h1>/g)].map((m) => m[1])
    expect(h1s).toHaveLength(1)
    expect(h1s[0]).toMatch(/Workday application status/i)
    const { metadata } = (await import(`../app/guides/${slug}/page.tsx`)) as { metadata: Metadata }
    expect(`${metadata.title} | Cover Me`.length).toBeLessThan(60)
  }, 20_000)

  it('cites a linked HR or Workday source on every row of the status table', async () => {
    const html = await render()
    const rows = [...html.matchAll(/<tbody>(.*?)<\/tbody>/g)].flatMap((m) => m[1].split('</tr>').filter(Boolean))
    expect(rows.length).toBeGreaterThanOrEqual(4)
    for (const row of rows) expect(row).toMatch(/<a href="https:\/\/(hr\.wisc\.edu|www\.washington\.edu|hr\.uw\.edu|doc\.workday\.com|info\.montgomerycollege\.edu)\//)
  }, 20_000)

  it('links to /for/workday, and /for/workday links back', async () => {
    expect(await render()).toContain('href="/for/workday"')
    const { renderToStaticMarkup } = await import('react-dom/server')
    const { default: BoardPage } = await import('../app/for/[board]/page')
    const board = renderToStaticMarkup(await BoardPage({ params: Promise.resolve({ board: 'workday' }) }))
    expect(board).toContain(`href="/guides/${slug}"`)
  }, 20_000)

  it('answers the status questions people search for in its FAQ markup', async () => {
    const html = await render()
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]))
    const faq = blocks.find((b) => b['@type'] === 'FAQPage')
    expect(faq.mainEntity.map((q: { name: string }) => q.name)).toEqual([
      'What does "Completed" mean on a Workday application?',
      'Does Workday tell you when you are rejected?',
      'What does "In Progress" mean on Workday?',
      'Is "In Progress" a good sign on Workday?',
      'What does "Submitted" mean on Workday?',
    ])
  }, 20_000)
})

describe('the ATS resume template guide', () => {
  const slug = 'ats-resume-template'
  const render = async () => {
    const { renderToStaticMarkup } = await import('react-dom/server')
    const { default: Page } = await import(`../app/guides/${slug}/page.tsx`)
    return renderToStaticMarkup(h(Page))
  }

  it('offers the Word template as a direct download before the first section', async () => {
    const html = await render()
    const href = '/guides/ats-resume-template/ats-resume-template.docx'
    expect(existsSync(join(__dirname, '../public', href))).toBe(true)
    const link = html.indexOf(`href="${href}"`)
    expect(link).toBeGreaterThan(-1)
    expect(html.slice(html.lastIndexOf('<a', link), html.indexOf('>', link))).toContain('download=""')
    expect(link).toBeLessThan(html.indexOf('<section'))
  }, 20_000)

  it('names the four systems and both test dates, and links to the test write-up', async () => {
    const html = await render()
    const text = html.replace(/<[^>]+>/g, ' ')
    for (const ats of ['Lever', 'Workday', 'Ashby', 'SmartRecruiters']) expect(text).toContain(ats)
    expect(text).toContain('October 31, 2026')
    expect(text).toContain('November 24, 2026')
    expect(html).toContain('href="/guides/ats-friendly-resume-format"')
  }, 20_000)

  it('has a full page title under 60 characters', async () => {
    const { metadata } = (await import(`../app/guides/${slug}/page.tsx`)) as { metadata: Metadata }
    expect(`${metadata.title} | Cover Me`.length).toBeLessThan(60)
  }, 20_000)

  it("is the Cover Me Word layout, so it matches what the tailor downloads (UPDATE_ATS_TEMPLATE=1 rebuilds it)", async () => {
    const path = join(__dirname, '../public/guides/ats-resume-template/ats-resume-template.docx')
    const built = Buffer.from(await (await buildResumeDocx(ATS_RESUME_TEMPLATE)).arrayBuffer())
    if (process.env.UPDATE_ATS_TEMPLATE) writeFileSync(path, built)
    const parts = async (bytes: Buffer) => {
      const zip = await JSZip.loadAsync(bytes)
      const names = Object.keys(zip.files).filter((n) => n !== 'docProps/core.xml').sort()
      return Object.fromEntries(await Promise.all(names.map(async (n) => [n, await zip.file(n)!.async('string')])))
    }
    expect(await parts(readFileSync(path))).toEqual(await parts(built))
  }, 20_000)

  it('is linked from the ATS format guide', () => {
    expect(readFileSync(join(__dirname, '../app/guides/ats-friendly-resume-format/page.tsx'), 'utf8')).toContain(`href="/guides/${slug}"`)
  })
})
