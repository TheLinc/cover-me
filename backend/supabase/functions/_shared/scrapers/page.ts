import { scrapeJobPage } from './index.ts'
import type { JobData } from './types.ts'

type Dom = any
export type ParseHTML = (html: string) => Dom
type ParserClass = new (handler: { onopentagname?(name: string): void; onclosetag?(name: string): void }) => { end(html: string): void }
export interface Parsers { parseHTML: ParseHTML; Parser: ParserClass }

// The scrapers read globals, swapped in for one synchronous call so concurrent
// requests in one isolate never see each other's page (#3)
const GLOBALS = ['window', 'document', 'Node', 'HTMLElement', 'ShadowRoot', 'DOMParser'] as const

// Real postings measured at most ~9k "<", ~5k elements and depth 42. "<" is
// counted in the raw HTML, before linkedom allocates anything (#3).
const MAX_TAGS = 150_000
const MAX_ELEMENTS = 60_000
const MAX_DEPTH = 256
// The scrapers read a block's whole subtree for every block around it, so a
// request's reads are capped by the nodes, attributes and characters they
// cover (#357). The parse is charged first, from the raw HTML (#362):
// - linkedom takes ~2 µs per attribute. Every attribute name follows
//   whitespace, "/" or a quote, so each start of a word after one is counted.
// - linkedom makes a text node for every "&" entity.
// Stripped snapshots from the extension use at most 300M. The raw, unstripped
// test fixtures use up to 1,355M.
const MAX_WORK = 2_000_000_000
const NODE_WORK = 400
const NAME_WORK = 8000
export interface Meter { work: number }
let charge: ((node: Dom) => void) | undefined

export function scrapeUntrusted({ parseHTML, Parser }: Parsers, url: string, html: string, meter?: Meter): JobData {
  checkNesting(Parser, html)
  return scrapeHtml(parseHTML, url, html, meter)
}

export function scrapeHtml(parseHTML: ParseHTML, url: string, html: string, meter: Meter = { work: 0 }): JobData {
  if (meter.work > MAX_WORK) throw new Error('This page is too large to read.')
  let tags = 0
  for (let i = html.indexOf('<'); i !== -1; i = html.indexOf('<', i + 1)) {
    if (++tags > MAX_TAGS) throw new Error('This page is too large to read.')
  }
  if ((meter.work += nameStarts(html) * NAME_WORK) > MAX_WORK) throw new Error('This page is too large to read.')
  const dom = parseHTML(html)
  dom.window.location = new URL(url)
  // Before attachShadowRoots, which recurses once per nested template (#3)
  checkSize(dom.document)
  patchLayoutApis(dom)
  attachShadowRoots(dom.document)

  const weights = new WeakMap<Dom, number>()
  const weigh = (node: Dom): number => {
    const cached = weights.get(node)
    if (cached !== undefined) return cached
    let sum = NODE_WORK * (1 + (node.attributes?.length ?? 0)) + (node.nodeType === 3 ? node.textContent.length : 0)
    for (const c of node.childNodes ?? []) sum += weigh(c)
    weights.set(node, sum)
    return sum
  }
  const g = globalThis as Record<string, unknown>
  const saved = GLOBALS.map((k) => g[k])
  GLOBALS.forEach((k) => (g[k] = k === 'window' ? dom.window : dom[k]))
  charge = (node) => {
    if ((meter.work += weigh(node)) > MAX_WORK) throw new Error('This page is too large to read.')
  }
  try {
    return scrapeJobPage()
  } finally {
    charge = undefined
    GLOBALS.forEach((k, i) => (g[k] = saved[i]))
  }
}

function checkSize(doc: Dom) {
  let count = 0
  const stack: [Dom, number][] = [[doc.documentElement, 1]]
  while (stack.length) {
    const [el, depth] = stack.pop()!
    if (++count > MAX_ELEMENTS || depth > MAX_DEPTH) throw new Error('This page is too large to read.')
    // linkedom keeps a <template>'s markup in its children. Its .content is a
    // deep copy, which nested templates would multiply (#3).
    for (const child of el.children) stack.push([child, depth + 1])
  }
}

// linkedom parses with htmlparser2, which keeps its open tags and its
// svg/math context in lists it shifts and searches on every tag. Running
// htmlparser2 alone first, and stopping once either list outgrows any
// posting, keeps that walk linear before linkedom builds anything (#362).
const FOREIGN = new Set(['math', 'svg', 'mi', 'mo', 'mn', 'ms', 'mtext', 'annotation-xml', 'foreignobject', 'desc', 'title'])
const MAX_FOREIGN = 5_000
function checkNesting(Parser: ParserClass, html: string) {
  let depth = 0, foreign = 0
  new Parser({
    onopentagname(name) {
      if (++depth > MAX_DEPTH || (FOREIGN.has(name) && ++foreign > MAX_FOREIGN)) throw new Error('This page is too large to read.')
    },
    onclosetag() {
      depth--
    },
  }).end(html)
}

// htmlparser2's whitespace is only these five: any other control character
// starts a name (#362)
const SPACE = new Set([9, 10, 12, 13, 32])
function nameStarts(html: string): number {
  let n = 0
  for (let i = 1; i < html.length; i++) {
    const p = html.charCodeAt(i - 1), c = html.charCodeAt(i)
    if (c === 38) n++
    else if ((p <= 32 || p === 47 || p === 34 || p === 39) && !SPACE.has(c) && c !== 47 && c !== 62) n++
  }
  return n
}

// Snapshots carry open shadow roots (LinkedIn's job pane) as <template
// shadowrootmode>, which linkedom parses as plain templates (#3)
function attachShadowRoots(root: Dom) {
  for (const t of Array.from(root.querySelectorAll('template[shadowrootmode]')) as Dom[]) {
    const host = t.parentNode
    if (!host?.attachShadow || host.shadowRoot) continue
    const shadow = host.attachShadow({ mode: t.getAttribute('shadowrootmode') === 'closed' ? 'closed' : 'open' })
    // Not t.content, which deep-copies (#3)
    while (t.firstChild) shadow.appendChild(t.firstChild)
    t.remove()
    attachShadowRoots(shadow)
  }
}

const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'TITLE'])
const BLOCK = new Set(['ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DD', 'DIV', 'DL', 'DT', 'FIELDSET', 'FIGCAPTION',
  'FIGURE', 'FOOTER', 'FORM', 'HEADER', 'HR', 'LI', 'MAIN', 'NAV', 'OL', 'PRE', 'SECTION', 'TABLE', 'TR', 'UL'])

const METERED = Symbol('metered')

// linkedom's classes are shared by every parse, so each is wrapped once (#357)
function meterSubtreeReads(dom: Dom) {
  const wrap = (from: Dom, name: string) => {
    let proto = from
    while (!Object.getOwnPropertyDescriptor(proto, name)) proto = Object.getPrototypeOf(proto)
    const d = Object.getOwnPropertyDescriptor(proto, name)!
    const fn = d.get ?? d.value
    if (fn[METERED]) return
    const metered = Object.assign(function (this: Dom, ...args: unknown[]) {
      charge?.(this)
      return fn.apply(this, args)
    }, { [METERED]: true })
    Object.defineProperty(proto, name, d.get ? { ...d, get: metered } : { ...d, value: metered })
  }
  wrap(dom.Element.prototype, 'querySelectorAll')
  wrap(dom.Document.prototype, 'querySelectorAll')
  wrap(dom.Element.prototype, 'textContent')
}

function patchLayoutApis(dom: Dom) {
  meterSubtreeReads(dom)
  const kinds = new WeakMap<Dom, string | number>()
  const kindOf = (c: Dom): string | number => {
    if (c.nodeType === 3) return c.textContent.replace(/\s+/g, ' ')
    if (c.nodeType !== 1) return -1
    const tag = c.tagName
    if (SKIP.has(tag) || c.hasAttribute('hidden') || /display\s*:\s*none/i.test(c.getAttribute('style') ?? '')) return -1
    if (tag === 'BR') return '\n'
    return tag === 'P' || /^H[1-6]$/.test(tag) ? 2 : BLOCK.has(tag) ? 1 : 0
  }
  Object.defineProperty(dom.HTMLElement.prototype, 'innerText', {
    configurable: true,
    get(this: Dom) {
      charge?.(this)
      const out: (string | number)[] = []
      const walk = (node: Dom) => {
        for (const c of node.childNodes) {
          let kind = kinds.get(c)
          if (kind === undefined) kinds.set(c, kind = kindOf(c))
          if (typeof kind === 'string') {
            out.push(kind)
            continue
          }
          if (kind < 0) continue
          if (kind) out.push(kind)
          walk(c)
          if (kind) out.push(kind)
        }
      }
      walk(this)
      const parts: string[] = []
      let pending = 0
      for (const item of out) {
        if (typeof item === 'number') { pending = Math.max(pending, item); continue }
        if (item === '\n') { parts.push(item); continue }
        if (!item.trim()) { if (!pending) parts.push(' '); continue }
        if (pending && parts.length) parts.push('\n'.repeat(pending))
        pending = 0
        parts.push(item)
      }
      return parts.join('').split('\n').map((l) => l.replace(/ {2,}/g, ' ').trim()).join('\n').trim()
    },
  })

  // linkedom answers wrongly for nodes that aren't siblings, and lacks the
  // DOCUMENT_POSITION_* constants (#3)
  Object.assign(dom.Node, {
    DOCUMENT_POSITION_DISCONNECTED: 1, DOCUMENT_POSITION_PRECEDING: 2, DOCUMENT_POSITION_FOLLOWING: 4,
    DOCUMENT_POSITION_CONTAINS: 8, DOCUMENT_POSITION_CONTAINED_BY: 16, DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC: 32,
  })
  // Walking siblings per call took 4 s on 29,000 sibling links, so tree order is
  // numbered once; the scrapers only read the page (#21)
  const order = new WeakMap<Dom, number>()
  const numbered = new WeakSet<Dom>()
  const numberTree = (root: Dom) => {
    let i = 0
    const stack: Dom[] = [root]
    while (stack.length) {
      const n = stack.pop()
      order.set(n, i++)
      // Not firstChild/nextSibling: linkedom's doctype has no nextSibling (#21)
      const kids = Array.from(n.childNodes) as Dom[]
      for (let k = kids.length - 1; k >= 0; k--) stack.push(kids[k])
    }
    numbered.add(root)
  }
  dom.Node.prototype.compareDocumentPosition = function (this: Dom, other: Dom): number {
    if (this === other) return 0
    const chain = (n: Dom) => { const a: Dom[] = []; for (let x = n; x; x = x.parentNode) a.push(x); return a.reverse() }
    const a = chain(this), b = chain(other)
    if (a[0] !== b[0]) return 1 | 32
    let i = 0
    while (i < a.length && i < b.length && a[i] === b[i]) i++
    if (i === a.length) return 16 | 4
    if (i === b.length) return 8 | 2
    if (!numbered.has(a[0])) numberTree(a[0])
    const x = order.get(a[i]), y = order.get(b[i])
    if (x !== undefined && y !== undefined) return y > x ? 4 : 2
    for (let s = a[i].nextSibling; s; s = s.nextSibling) if (s === b[i]) return 4
    return 2
  }
}
