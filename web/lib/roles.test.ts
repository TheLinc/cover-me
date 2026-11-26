import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { MIN_POSTINGS, ROLE_SLUGS } from './role-keywords'
import { FETCHED, ROLES } from './roles'

let renderRole: (slug: string) => Promise<string>

describe('role keyword pages', () => {
  // The first import of the page and react-dom takes about 4 s, past the 5 s test timeout when the suite runs in parallel (#299).
  beforeAll(async () => {
    const { renderToStaticMarkup } = await import('react-dom/server')
    const { default: RolePage } = await import('../app/resume-keywords/[role]/page')
    renderRole = async (slug) => renderToStaticMarkup(await RolePage({ params: Promise.resolve({ role: slug }) }))
  }, 60_000)

  it('has a page for every role the script counts', () => {
    expect(ROLES.map((r) => r.slug).sort()).toEqual([...ROLE_SLUGS].sort())
  })

  it.each(ROLES.map((r) => [r.slug, r] as const))('%s counts at least 30 postings and lists keywords', (_, r) => {
    expect(r.counts.postings).toBeGreaterThanOrEqual(MIN_POSTINGS)
    expect(r.counts.keywords.length).toBeGreaterThan(0)
  })

  it.each(ROLES.map((r) => [r.slug, r] as const))('%s has a page title Google shows in full', (_, r) => {
    expect(`${r.metaTitle} | Cover Me`.length).toBeLessThanOrEqual(60)
  })

  it('shows each keyword as a count of the postings read, with the sources and date', async () => {
    const sales = ROLES.find((r) => r.slug === 'sales')!
    const html = await renderRole('sales')
    const top = sales.counts.keywords[0]
    expect(html).toContain(`>${top.name}</td>`)
    expect(html).toContain(`${top.postings} of ${sales.counts.postings}`)
    expect(html).toMatch(new RegExp(`${sales.counts.postings} sales postings from ${sales.counts.companies} companies`))
    expect(html).toContain(`Greenhouse (${sales.counts.sources.Greenhouse})`)
    expect(html).toContain(`Lever (${sales.counts.sources.Lever})`)
    expect(html).toContain(`<time dateTime="${FETCHED}">`)
    expect(html).toContain('href="/ats-checker"')
  })

  it('lists every role page in the sitemap and llms.txt', async () => {
    const { default: sitemap } = await import('../app/sitemap')
    const urls = sitemap().map((e) => e.url)
    const llms = readFileSync(join(__dirname, '../public/llms.txt'), 'utf8')
    for (const path of ['/resume-keywords', ...ROLES.map((r) => `/resume-keywords/${r.slug}`)]) {
      expect(urls).toContain(`https://www.cover-me.dev${path}`)
      expect(llms).toContain(`(https://www.cover-me.dev${path})`)
    }
  })
})
