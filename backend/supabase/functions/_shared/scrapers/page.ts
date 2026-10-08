import { scrapeJobPage } from './index.ts'
import type { JobData } from './types.ts'

// Runs the scrapers on page HTML outside a browser: in the scrape Edge
// Function and in the fixture tests, so the tests check what the server runs.
// The caller passes linkedom's parseHTML (npm:linkedom in Deno, linkedom in
// Node). linkedom has no layout, so innerText and compareDocumentPosition are
// replaced below, and declarative shadow roots are attached by hand.
//
// The scrapers read globals (document, window, Node...). They are swapped in
// for one synchronous call and restored after, so concurrent requests in one
// isolate never see each other's page.

// deno-lint-ignore no-explicit-any
type Dom = any
export type ParseHTML = (html: string) => Dom

const GLOBALS = ['window', 'document', 'Node', 'HTMLElement', 'ShadowRoot', 'DOMParser'] as const

export function scrapeHtml(parseHTML: ParseHTML, url: string, html: string): JobData {
  const dom = parseHTML(html)
  dom.window.location = new URL(url)
  patchLayoutApis(dom)
  attachShadowRoots(dom.document)

  const g = globalThis as Record<string, unknown>
  const saved = GLOBALS.map((k) => g[k])
  GLOBALS.forEach((k) => (g[k] = k === 'window' ? dom.window : dom[k]))
  try {
    return scrapeJobPage()
  } finally {
    GLOBALS.forEach((k, i) => (g[k] = saved[i]))
  }
}

// The extension serializes open shadow roots as <template shadowrootmode>
// (LinkedIn renders its job pane in one); linkedom parses them as templates.
function attachShadowRoots(root: Dom) {
  for (const t of Array.from(root.querySelectorAll('template[shadowrootmode]')) as Dom[]) {
    const host = t.parentNode
    if (!host?.attachShadow || host.shadowRoot) continue
    const shadow = host.attachShadow({ mode: t.getAttribute('shadowrootmode') === 'closed' ? 'closed' : 'open' })
    shadow.appendChild(t.content)
    t.remove()
    attachShadowRoots(shadow)
  }
}

const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'TITLE'])
const BLOCK = new Set(['ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DD', 'DIV', 'DL', 'DT', 'FIELDSET', 'FIGCAPTION',
  'FIGURE', 'FOOTER', 'FORM', 'HEADER', 'HR', 'LI', 'MAIN', 'NAV', 'OL', 'PRE', 'SECTION', 'TABLE', 'TR', 'UL'])

function patchLayoutApis(dom: Dom) {
  // Chrome's innerText, without CSS: skips non-rendered elements and hidden
  // ones it can tell from markup, puts block elements on their own lines and a
  // blank line around paragraphs and headings, and collapses whitespace.
  Object.defineProperty(dom.HTMLElement.prototype, 'innerText', {
    configurable: true,
    get(this: Dom) {
      const out: (string | number)[] = []
      const walk = (node: Dom) => {
        for (const c of node.childNodes) {
          if (c.nodeType === 3) out.push(c.textContent.replace(/\s+/g, ' '))
          if (c.nodeType !== 1) continue
          const tag = c.tagName
          if (SKIP.has(tag) || c.hasAttribute('hidden') || /display\s*:\s*none/i.test(c.getAttribute('style') ?? '')) continue
          if (tag === 'BR') { out.push('\n'); continue }
          const breaks = tag === 'P' || /^H[1-6]$/.test(tag) ? 2 : BLOCK.has(tag) ? 1 : 0
          if (breaks) out.push(breaks)
          walk(c)
          if (breaks) out.push(breaks)
        }
      }
      walk(this)
      // A run of required line breaks becomes the largest of them; whitespace
      // next to a break disappears; none at the ends.
      const parts: string[] = []
      let pending = 0
      for (const item of out) {
        if (typeof item === 'number') { pending = Math.max(pending, item); continue }
        if (item === '\n') { parts.push(item); continue } // <br>
        if (!item.trim()) { if (!pending) parts.push(' '); continue }
        if (pending && parts.length) parts.push('\n'.repeat(pending))
        pending = 0
        parts.push(item)
      }
      return parts.join('').split('\n').map((l) => l.replace(/ {2,}/g, ' ').trim()).join('\n').trim()
    },
  })

  // linkedom answers wrongly for nodes that aren't siblings, and lacks the
  // DOCUMENT_POSITION_* constants. Tree order by ancestor chains.
  Object.assign(dom.Node, {
    DOCUMENT_POSITION_DISCONNECTED: 1, DOCUMENT_POSITION_PRECEDING: 2, DOCUMENT_POSITION_FOLLOWING: 4,
    DOCUMENT_POSITION_CONTAINS: 8, DOCUMENT_POSITION_CONTAINED_BY: 16, DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC: 32,
  })
  dom.Node.prototype.compareDocumentPosition = function (this: Dom, other: Dom): number {
    if (this === other) return 0
    const chain = (n: Dom) => { const a: Dom[] = []; for (let x = n; x; x = x.parentNode) a.unshift(x); return a }
    const a = chain(this), b = chain(other)
    if (a[0] !== b[0]) return 1 | 32 // DISCONNECTED | IMPLEMENTATION_SPECIFIC
    let i = 0
    while (i < a.length && i < b.length && a[i] === b[i]) i++
    if (i === a.length) return 16 | 4 // other is inside this: CONTAINED_BY | FOLLOWING
    if (i === b.length) return 8 | 2 // other contains this: CONTAINS | PRECEDING
    const siblings = Array.from(a[i - 1].childNodes)
    return siblings.indexOf(b[i]) > siblings.indexOf(a[i]) ? 4 : 2
  }
}
