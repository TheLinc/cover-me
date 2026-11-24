import { parseHTML } from 'linkedom'
import { expect, test } from 'vitest'
import { scrapeHtml } from './page.ts'

const nested = (depth: number, inner: string) => `<html><body>${'<div>'.repeat(depth)}${inner}${'</div>'.repeat(depth)}</body></html>`
const elapsed = (run: () => void) => {
  const start = performance.now()
  run()
  return performance.now() - start
}

// Every block re-read the text inside it: 37 s for spaced text and 11 s for
// many text nodes 254 levels deep, against the scrape function's 2 s of CPU (#357)
test.each([
  { case: '3.4 MB of words in 254 nested blocks', inner: 'lorem ipsum dolor '.repeat(190_000), limit: 2000 },
  { case: '140,000 text nodes in 254 nested blocks', inner: 'a b<!---->'.repeat(140_000) },
  { case: '50,000 spans in 200 nested blocks', inner: '<b>a b</b>'.repeat(50_000), depth: 200 },
])('deeply nested text fails fast: $case', ({ inner, depth = 254, limit = 4000 }) => {
  expect(elapsed(() => expect(() => scrapeHtml(parseHTML, 'https://careers.example.com/jobs/1', nested(depth, inner))).toThrow())).toBeLessThan(limit)
})

test('a scraper that catches the error still stops reading', () => {
  const html = `<!doctype html><html><body><main>${'<code id="bpr-guid-1">'.repeat(250)}${'a<!---->'.repeat(149_000)}${'</code>'.repeat(250)}</main></body></html>`
  expect(elapsed(() => expect(() => scrapeHtml(parseHTML, 'https://www.linkedin.com/jobs/view/1/', html)).toThrow())).toBeLessThan(4000)
})

test('the pages of one request share the cap', () => {
  const page = nested(254, 'a b<!---->'.repeat(49_000))
  const meter = { work: 0 }
  expect(elapsed(() => {
    for (let i = 0; i < 8; i++) expect(() => scrapeHtml(parseHTML, 'https://careers.example.com/jobs/1', page, meter)).toThrow()
  })).toBeLessThan(4000)
})
