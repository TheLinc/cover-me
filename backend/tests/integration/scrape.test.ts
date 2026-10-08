import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { FIXTURE_CASES, fixtureUrl } from '../../../extension/src/content/scrapers/fixtures/cases.ts'
import { callFunction } from './helpers'

// The extension's saved postings, read by the served function: the same cases
// the extension's fixture tests check, so the deployed scrapers match.
const FIXTURES = join(__dirname, '../../../extension/src/content/scrapers/fixtures')
const page = (board: string) => {
  const html = readFileSync(join(FIXTURES, `${board}.html`), 'utf8')
  return { url: fixtureUrl(html), html }
}

describe('scrape', () => {
  it.each(FIXTURE_CASES)('reads $board, without an account', async ({ board, title, company, ends }) => {
    const res = await callFunction('scrape', { body: { pages: [page(board)] } })
    expect(res.status).toBe(200)
    const [result] = (await res.json()).results
    expect(result).toMatchObject({ ok: true, job: { title, company } })
    expect(result.job.description.trim().endsWith(ends)).toBe(true)
  })

  it('answers each page of a multi-frame tab in order', async () => {
    const res = await callFunction('scrape', { body: { pages: [page('lever'), page('workday')] } })
    const results = (await res.json()).results
    expect(results.map((r: { job: { company: string } }) => r.job.company)).toEqual(['Palantir Technologies', 'Nvidia'])
  })

  it('accepts the gzip body the extension sends', async () => {
    const res = await callFunction('scrape', {
      headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' },
      rawBody: gzipSync(JSON.stringify({ pages: [page('lever')] })),
    })
    expect(res.status).toBe(200)
    expect((await res.json()).results[0]).toMatchObject({ ok: true, job: { company: 'Palantir Technologies' } })
  })

  it('reports a page with no posting per page, not as a request failure', async () => {
    const res = await callFunction('scrape', { body: { pages: [{ url: 'https://example.com/about', html: '<html><body><h1>About us</h1></body></html>' }] } })
    expect(res.status).toBe(200)
    expect((await res.json()).results[0]).toMatchObject({ ok: false })
  })

  it('rejects malformed requests', async () => {
    for (const body of [{}, { pages: [] }, { pages: [{ url: 'javascript:alert(1)', html: '' }] }, { pages: Array(9).fill(page('lever')) }]) {
      expect((await callFunction('scrape', { body })).status).toBe(400)
    }
  })

  it('stops reading a body that expands past the limit', async () => {
    const res = await callFunction('scrape', {
      headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' },
      rawBody: gzipSync(JSON.stringify({ pages: [{ url: 'https://example.com/', html: 'a'.repeat(5_000_000) }] })),
    })
    expect(res.status).toBe(413)
  })
})
