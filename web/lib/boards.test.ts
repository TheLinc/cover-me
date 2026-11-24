import { describe, expect, it, vi } from 'vitest'
import { BOARDS } from './boards'

vi.mock('next/font/google', () => ({ Source_Serif_4: () => ({ className: '' }) }))

async function renderBoard(slug: string) {
  const { renderToStaticMarkup } = await import('react-dom/server')
  const { default: BoardPage } = await import('../app/for/[board]/page')
  const html = renderToStaticMarkup(await BoardPage({ params: Promise.resolve({ board: slug }) }))
  const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]))
  return { html, jsonLd }
}

describe('board pages', () => {
  it.each(BOARDS.map((b) => [b.slug, b] as const))('%s has its own lastmod in the sitemap', async (slug, b) => {
    const { default: sitemap } = await import('../app/sitemap')
    const entry = sitemap().find((e) => e.url === `https://www.cover-me.dev/for/${slug}`)
    expect(entry?.lastModified).toBe(b.updated)
  })

  it.each(BOARDS.map((b) => [b.slug, b] as const))('%s has a page title Google shows in full', (_, b) => {
    expect(`${b.metaTitle} | Cover Me`.length).toBeLessThanOrEqual(60)
  })

  it('shows when the page was updated and gives it as dateModified', async () => {
    const { html, jsonLd } = await renderBoard('linkedin')
    expect(html).toContain('<time dateTime="2026-11-24">Updated November 24, 2026</time>')
    expect(jsonLd.find((b) => b['@type'] === 'WebPage')).toMatchObject({
      url: 'https://www.cover-me.dev/for/linkedin',
      name: 'How to add a cover letter on LinkedIn',
      dateModified: '2026-11-24',
    })
  }, 20_000)

  it("cites LinkedIn's help page for how applying works, in a new tab", async () => {
    const { html } = await renderBoard('linkedin')
    const link = html.match(/<a ([^>]*)>LinkedIn&#x27;s help page<\/a>/)?.[1]
    expect(link).toContain('href="https://www.linkedin.com/help/linkedin/answer/a512388"')
    expect(link).toContain('target="_blank"')
    expect(link).toContain('rel="noopener noreferrer"')
  }, 20_000)
})
