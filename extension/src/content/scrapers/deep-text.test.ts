import { parseHTML } from 'linkedom'
import { expect, test } from 'vitest'
import { scrapeHtml } from './page.ts'

const nested = (depth: number, inner: string) => `<html><body>${'<div>'.repeat(depth)}${inner}${'</div>'.repeat(depth)}</body></html>`
const elapsed = (run: () => void) => {
  const start = performance.now()
  run()
  return performance.now() - start
}

// The scrape function gets 2 s of CPU; these pages took 6 to 37 s (#357)
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

test.each([
  { case: 'a link beside 58,000 hidden elements in 250 nested blocks', main: `${'<div>'.repeat(250)}<a href="/x">${'lorem ipsum dolor '.repeat(40)}</a><div style="display:none">${'<i></i>'.repeat(58_000)}</div>${'</div>'.repeat(250)}` },
  { case: 'card lists at 125 levels above 140,000 text nodes', main: Array.from({ length: 125 }, (_, i) => `<div>${['a', 'b', 'c'].map((c) => `<div class="c"><a href="/${c}${i}">Job ${c}${i}</a><span>x${i}</span></div>`).join('')}<div>`).join('') + 'a b<!---->'.repeat(140_000) + '</div></div>'.repeat(125) },
])('other reads of each block fail fast too: $case', ({ main }) => {
  const page = `<!doctype html><html><body><h1>Clerk</h1>${main}</body></html>`
  const meter = { work: 0 }
  expect(elapsed(() => {
    for (let i = 0; i < 8; i++) {
      try { scrapeHtml(parseHTML, 'https://careers.example.com/jobs/1', page, meter) } catch {}
    }
  })).toBeLessThan(4000)
})

test('the pages of one request share the cap', () => {
  const page = nested(254, 'a b<!---->'.repeat(49_000))
  const meter = { work: 0 }
  expect(elapsed(() => {
    for (let i = 0; i < 8; i++) expect(() => scrapeHtml(parseHTML, 'https://careers.example.com/jobs/1', page, meter)).toThrow()
  })).toBeLessThan(4000)
})
