import { parseHTML } from 'linkedom'
import { expect, test } from 'vitest'
import { scrapeHtml } from './page.ts'

// Every block re-read the text inside it: 37 s for spaced text and 11 s for
// many text nodes 254 levels deep, against the scrape function's 2 s of CPU (#355)
test.each([
  { case: '3.4 MB of words in 254 nested blocks', inner: 'lorem ipsum dolor '.repeat(190_000), limit: 2000 },
  { case: '140,000 text nodes in 254 nested blocks', inner: 'a b<!---->'.repeat(140_000) },
  { case: '50,000 spans in 200 nested blocks', inner: '<b>a b</b>'.repeat(50_000), depth: 200 },
])('deeply nested text fails fast: $case', ({ inner, depth = 254, limit = 4000 }) => {
  const html = `<html><body>${'<div>'.repeat(depth)}${inner}${'</div>'.repeat(depth)}</body></html>`
  const start = performance.now()
  expect(() => scrapeHtml(parseHTML, 'https://careers.example.com/jobs/1', html)).toThrow()
  expect(performance.now() - start).toBeLessThan(limit)
})
