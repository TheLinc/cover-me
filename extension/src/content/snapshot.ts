// The page as the scrape Edge Function reads it: rendered HTML with open
// shadow roots serialized as <template shadowrootmode> (LinkedIn renders its
// job pane in one), minus everything the scrapers never read. Stripping
// happens here so what carries the signed-in user's details or tokens never
// leaves the browser: scripts and embedded data blobs, form fields (hidden
// inputs hold CSRF tokens and prefilled emails), <meta> (CSRF tokens),
// leftover <template>s, long attribute values (sites stash JSON state in
// data-* attributes), and link query strings (tokens ride in them). The
// scrapers read only short attributes and link paths.
export const STRIP_SELECTOR =
  'script:not([type="application/ld+json"]), code[id^="bpr-guid"], style, link, meta, noscript, template, input, textarea, select, ' +
  'svg, img, picture, video, audio, canvas, iframe, object, embed'
const MAX_ATTRIBUTE_CHARS = 300
const LONG_ATTRIBUTES_KEPT = new Set(['class', 'style'])

// Pages above this aren't sent; the bundled scrapers handle them.
export const MAX_SNAPSHOT_CHARS = 3_000_000

type HtmlSerializable = { getHTML(options: { shadowRoots: ShadowRoot[] }): string }
type HtmlParsing = { parseHTMLUnsafe(html: string): Document }

function openShadowRoots(root: Document | ShadowRoot, acc: ShadowRoot[] = []): ShadowRoot[] {
  for (const el of Array.from(root.querySelectorAll('*'))) {
    if (el.shadowRoot) {
      acc.push(el.shadowRoot)
      openShadowRoots(el.shadowRoot, acc)
    }
  }
  return acc
}

export interface PageSnapshot { url: string; html: string }

// Null when the browser lacks getHTML/parseHTMLUnsafe (Chrome before 125) or
// the page is too big.
export function snapshotPage(): PageSnapshot | null {
  const root = document.documentElement as unknown as Partial<HtmlSerializable>
  const parser = Document as unknown as Partial<HtmlParsing>
  if (typeof root.getHTML !== 'function' || typeof parser.parseHTMLUnsafe !== 'function') return null

  // Serialize with shadow roots, then strip in an inert copy (parsing attaches
  // the declarative roots again; nothing in it runs or loads).
  const copy = parser.parseHTMLUnsafe(root.getHTML({ shadowRoots: openShadowRoots(document) }))
  const roots = [copy, ...openShadowRoots(copy)]
  for (const r of roots) {
    r.querySelectorAll(STRIP_SELECTOR).forEach((el) => el.remove())
    for (const el of Array.from(r.querySelectorAll('*'))) {
      for (const { name, value } of Array.from(el.attributes)) {
        if (name === 'href') el.setAttribute('href', value.replace(/[?#].*$/s, ''))
        else if (value.length > MAX_ATTRIBUTE_CHARS && !LONG_ATTRIBUTES_KEPT.has(name)) el.removeAttribute(name)
      }
    }
  }
  // getHTML is the element's inner HTML; linkedom needs the <html> wrapper back
  // to find <head> (and with it <title>).
  const inner = (copy.documentElement as unknown as HtmlSerializable).getHTML({ shadowRoots: roots.slice(1) as ShadowRoot[] })
  const html = `<!doctype html>\n<html>${inner}</html>`
  return html.length <= MAX_SNAPSHOT_CHARS ? { url: location.href, html } : null
}
