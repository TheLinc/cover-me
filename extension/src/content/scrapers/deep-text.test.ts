import { Parser } from 'htmlparser2'
import { parseHTML } from 'linkedom'
import { expect, test } from 'vitest'
import { scrapeHtml, scrapeUntrusted } from './page.ts'

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

test.each([
  { case: '149,000 unclosed divs', html: `<html><body>${'<div>'.repeat(149_000)}` },
  { case: '74,000 divs between stray close tags', html: `<html><body>${'<div></b>'.repeat(74_000)}` },
  { case: '149,000 self-closed divs', html: `<html><body>${'<div/>'.repeat(149_000)}` },
  { case: '990,000 entities in one paragraph', html: `<html><body><p>${'&lt;'.repeat(990_000)}` },
  { case: 'namespaced tags closed by other names', html: `<html><body>${'<a:x></a:y>'.repeat(74_000)}` },
  { case: 'non-ASCII tag names', html: `<html><body>${'<dé></dè>'.repeat(74_000)}` },
  { case: 'stray close tags under deep nesting', html: `<html><body>${'<div>'.repeat(30_000)}${'</b>'.repeat(119_000)}` },
  { case: 'divs after a commented-out script tag', html: `<html><body><!--<script>-->${'<div>'.repeat(149_000)}</script>` },
  { case: 'divs after a script tag in an attribute', html: `<html><body><a title="<script>">${'<div>'.repeat(149_000)}</script>` },
  { case: 'many unclosed script tags', html: `<html><body>${'<script>'.repeat(10_000)}${'x'.repeat(3_000_000)}` },
  { case: 'svg contexts left open by closing their parents', html: `<html><body>${'<div><svg></div>'.repeat(49_000)}` },
])('pages that are slow to parse fail fast: $case', ({ html }) => {
  expect(elapsed(() => expect(() => scrapeUntrusted({ parseHTML, Parser }, 'https://careers.example.com/jobs/1', html)).toThrow())).toBeLessThan(1000)
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

const names = (count: number) => Array.from({ length: count }, (_, i) => `a${i}`)
const controls = [...Array(32).keys()].filter((c) => ![0, 9, 10, 12, 13].includes(c)).map((c) => String.fromCharCode(c))
const controlNames = (count: number) => Array.from({ length: count }, (_, i) => [1, 27, 729].map((d) => controls[Math.floor(i / d) % 27]).join(''))

test.each([
  { case: '4,000 spans with 200 attributes each in 250 nested blocks', inner: `<b ${names(200).join(' ')}>a</b>`.repeat(4000), depth: 250 },
  { case: '360 spans with 2,000 attributes each', inner: `<b ${names(2000).join(' ')}>a</b>`.repeat(360), depth: 1 },
  { case: '220 spans with 2,000 attributes each, none spaced', inner: `<b ${names(2000).join('=""')}>a</b>`.repeat(220), depth: 1 },
  { case: '360 spans with 2,000 attributes each after a quote', inner: `<b ="${names(2000).join(' ')}">a</b>`.repeat(360), depth: 1 },
  { case: '480 spans with 2,000 attributes each named in control characters', inner: `<b ${controlNames(2000).join(' ')}>a</b>`.repeat(480), depth: 1 },
])('attributes are capped before parsing: $case', ({ inner, depth }) => {
  const html = nested(depth, inner)
  expect(html.length).toBeLessThan(4_000_000)
  expect(elapsed(() => expect(() => scrapeHtml(parseHTML, 'https://careers.example.com/jobs/1', html)).toThrow('too large'))).toBeLessThan(200)
})

test("attributes count against the request's cap", () => {
  const page = nested(250, `<b ${names(200).join(' ')}>a</b>`.repeat(290))
  const meter = { work: 0 }
  expect(elapsed(() => {
    for (let i = 0; i < 8; i++) expect(() => scrapeHtml(parseHTML, 'https://careers.example.com/jobs/1', page, meter)).toThrow()
  })).toBeLessThan(4000)
  expect(() => scrapeHtml(parseHTML, 'https://careers.example.com/jobs/1', page, meter)).toThrow('too large')
})

test('the first text after the title is found in one walk', () => {
  const style = `color:red;${' '.repeat(10_000)}`
  const html = `<!doctype html><html><body>${`<div style="${style}">`.repeat(250)}<h1>Payroll Clerk</h1>${'<i></i>'.repeat(50_000)}${'</div>'.repeat(250)}</body></html>`
  expect(elapsed(() => expect(() => scrapeHtml(parseHTML, 'https://careers.example.com/jobs/1', html)).toThrow('too large'))).toBeLessThan(2000)
})
