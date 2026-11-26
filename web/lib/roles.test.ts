import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { KINDS, MIN_POSTINGS, ROLE_SLUGS, isSorted, kindOf } from './role-keywords'
import { FETCHED, HELD, ROLES, answers, lead } from './roles'

let render: (path: string) => Promise<string>
const words = (s: string) => s.split(/\s+/).filter(Boolean).length
const each = ROLES.map((r) => [r.slug, r] as const)

describe('role keyword pages', () => {
  // The first import of the pages and react-dom takes about 4 s, past the 5 s test timeout when the suite runs in parallel (#299).
  beforeAll(async () => {
    const { renderToStaticMarkup } = await import('react-dom/server')
    const { default: RolePage } = await import('../app/resume-keywords/[role]/page')
    const { default: AtsCheckerPage } = await import('../app/ats-checker/page')
    render = async (path) =>
      path === '/ats-checker'
        ? renderToStaticMarkup(AtsCheckerPage())
        : renderToStaticMarkup(await RolePage({ params: Promise.resolve({ role: path.split('/').pop()! }) }))
  }, 60_000)

  it('publishes sales, marketing and engineering, and holds the roles whose sample is too narrow', () => {
    expect(ROLES.map((r) => r.slug)).toEqual(['sales', 'marketing', 'engineering'])
    expect([...ROLES.map((r) => r.slug), ...HELD].sort()).toEqual([...ROLE_SLUGS].sort())
  })

  it.each(each)('%s counts at least 30 postings and lists keywords', (_, r) => {
    expect(r.counts.postings).toBeGreaterThanOrEqual(MIN_POSTINGS)
    expect(r.counts.keywords.length).toBeGreaterThanOrEqual(4)
  })

  it.each(each)('%s has a page title with the posting count that Google shows in full', (_, r) => {
    expect(r.metaTitle).toContain(`${r.counts.postings} Job Postings`)
    expect(`${r.metaTitle} | Cover Me`.length).toBeLessThanOrEqual(60)
  })

  it.each(each)('%s has a meta description that quotes its top tool as a share and fits in a search result', (_, r) => {
    const tool = r.counts.keywords.find((k) => kindOf(k.name) === 'Tools and software')!
    expect(r.metaDescription).toContain(`${tool.name} is named in ${Math.round((tool.postings / r.counts.postings) * 100)}% of ${r.counts.postings} ${r.noun} job postings`)
    expect(r.metaDescription.length).toBeLessThanOrEqual(160)
  })

  it.each(each)('%s offers its table as CSV under CC BY, credits who counted it, and says so in the Dataset schema', async (slug, r) => {
    const html = await render(`/resume-keywords/${slug}`)
    expect(html).toContain(`href="/resume-keywords/${slug}/keywords.csv"`)
    expect(html).toContain('href="https://creativecommons.org/licenses/by/4.0/"')
    expect(html).toContain('href="https://github.com/TheLinc/cover-me/blob/master/web/scripts/role-keywords.mjs"')
    const dataset = JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/.exec(html)![1]).find((d: { '@type': string }) => d['@type'] === 'Dataset')
    expect(dataset).toMatchObject({
      license: 'https://creativecommons.org/licenses/by/4.0/',
      description: r.metaDescription,
      distribution: { '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: `https://www.cover-me.dev/resume-keywords/${slug}/keywords.csv` },
    })
    expect(dataset.creator).toContainEqual(expect.objectContaining({ '@type': 'Person', name: 'Lincoln Laylor' }))
  })

  it('serves each table as CSV, one row per keyword', async () => {
    const { GET } = await import('../app/resume-keywords/[role]/keywords.csv/route')
    const sales = ROLES.find((r) => r.slug === 'sales')!
    const res = await GET(new Request('https://x'), { params: Promise.resolve({ role: 'sales' }) })
    expect(res.headers.get('Content-Type')).toContain('text/csv')
    const lines = (await res.text()).trim().split('\n')
    expect(lines[0]).toBe('keyword,type,postings,total_postings,share_percent')
    expect(lines).toHaveLength(sales.counts.keywords.length + 1)
    const top = sales.counts.keywords[0]
    expect(lines[1]).toBe(`${top.name},${kindOf(top.name)},${top.postings},${sales.counts.postings},${Math.round((top.postings / sales.counts.postings) * 100)}`)
    expect((await GET(new Request('https://x'), { params: Promise.resolve({ role: 'warehouse' }) })).status).toBe(404)
  })

  it('opens with the top keywords and the top tool, each as a share of the postings', () => {
    const sales = ROLES.find((r) => r.slug === 'sales')!
    const [first] = sales.counts.keywords
    const tool = sales.counts.keywords.find((k) => k.name === 'Salesforce')!
    const text = lead(sales)
    expect(text).toContain(`${first.name} (${Math.round((first.postings / sales.counts.postings) * 100)}%)`)
    expect(text).toContain(`Salesforce, in ${Math.round((tool.postings / sales.counts.postings) * 100)}% of them (${tool.postings} of ${sales.counts.postings})`)
    expect(text).not.toMatch(/\bsales \(/)
  })

  it('names the top tool once, and uses "an" before a vowel sound', () => {
    const engineering = ROLES.find((r) => r.slug === 'engineering')!
    expect(lead(engineering).match(/Python/g)).toHaveLength(1)
    const text = ROLES.flatMap((r) => answers(r).map(({ q, a }) => `${q} ${a}`)).join(' ')
    expect(text).not.toMatch(/\ba (engineering|MBA)\b/)
    expect(text).toContain('an engineering resume')
  })

  it.each(each)('%s answers each question in 40 to 60 words that quote the counts', (_, r) => {
    const qa = answers(r)
    expect(qa.length).toBeGreaterThanOrEqual(2)
    expect(qa.length).toBeLessThanOrEqual(4)
    for (const { q, a } of qa) {
      expect(q).toMatch(/\?$/)
      expect(words(a), a).toBeGreaterThanOrEqual(40)
      expect(words(a), a).toBeLessThanOrEqual(60)
      expect(a.match(new RegExp(`\\b${r.counts.postings}\\b`, 'g')), a).toHaveLength(1)
      expect(a).not.toMatch(/\ba [A-Z][a-z]+'s degree/)
    }
  })

  it.each(each)('%s has 3 to 5 example bullets, each using a keyword from its table', (_, r) => {
    expect(r.bullets.length).toBeGreaterThanOrEqual(3)
    expect(r.bullets.length).toBeLessThanOrEqual(5)
    const word = (name: string) => new RegExp(`(?<![\\w])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w])`)
    for (const b of r.bullets) expect(r.counts.keywords.some((k) => word(k.name).test(b)), b).toBe(true)
  })

  it('shows each keyword as a share and a count, grouped by type, with the sources, date and tech-company caveat', async () => {
    const sales = ROLES.find((r) => r.slug === 'sales')!
    const html = await render('/resume-keywords/sales')
    const top = sales.counts.keywords[0]
    expect(html).toContain(`>${top.name}</td>`)
    expect(html).toContain(`${top.postings} of ${sales.counts.postings}`)
    expect(html).toContain(`>${Math.round((top.postings / sales.counts.postings) * 100)}%</td>`)
    for (const kind of KINDS) expect(html).toContain(`>${kind}</h3>`)
    expect(html).toMatch(new RegExp(`${sales.counts.postings} sales postings from ${sales.counts.companies} companies`))
    expect(html).toContain(`Greenhouse (${sales.counts.sources.Greenhouse})`)
    expect(html).toContain(`Lever (${sales.counts.sources.Lever})`)
    expect(html).toContain('mostly to tech companies')
    expect(html).toContain(`<time dateTime="${FETCHED}">`)
    expect(html).toContain('>Where to put these keywords</h2>')
    for (const { q } of answers(sales)) expect(html).toContain(`>${q.replace(/'/g, '&#x27;')}</h2>`)
    expect(html).toContain('href="/ats-checker"')
    expect(html).toContain('href="/guides/tailor-resume-to-job-description"')
  })

  it('is linked from the ATS checker and the tailoring guide', async () => {
    expect(await render('/ats-checker')).toContain('href="/resume-keywords"')
    expect(readFileSync(join(__dirname, '../app/guides/tailor-resume-to-job-description/page.tsx'), 'utf8')).toContain('href="/resume-keywords"')
  })

  it('lists every published page, and no held one, in the sitemap and llms.txt', async () => {
    const { default: sitemap } = await import('../app/sitemap')
    const urls = sitemap().map((e) => e.url)
    const llms = readFileSync(join(__dirname, '../public/llms.txt'), 'utf8')
    for (const path of ['/resume-keywords', ...ROLES.map((r) => `/resume-keywords/${r.slug}`)]) {
      expect(urls).toContain(`https://www.cover-me.dev${path}`)
      expect(llms).toContain(`(https://www.cover-me.dev${path})`)
    }
    for (const slug of HELD) {
      expect(urls).not.toContain(`https://www.cover-me.dev/resume-keywords/${slug}`)
      expect(llms).not.toContain(`/resume-keywords/${slug})`)
    }
  })
})

describe('keyword types', () => {
  it.each(each)('%s puts every keyword in a type someone chose, so a new name fails here until it is sorted', (_, r) => {
    expect(r.counts.keywords.map((k) => k.name).filter((name) => !isSorted(name))).toEqual([])
  })

  it('tells engineers to name the tool, without sales words', () => {
    const engineering = ROLES.find((r) => r.slug === 'engineering')!
    expect(answers(engineering).map(({ a }) => a).join(' ')).not.toContain('CRM')
  })
})
