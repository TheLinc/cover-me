// Worker URL is a static asset reference (just a string) — keeping it static is fine.
// The heavy pdfjs-dist and mammoth libraries are loaded dynamically only when needed (https://github.com/TheLinc/cover-me/commit/2be30759f4e0e6eeb7bd69f5c563e35f19132107).
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { urlCore } from './ai/resume-parse'

export async function parseResume(file: File): Promise<string> {
  const name = file.name.toLowerCase()

  if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
    return parsePdf(file)
  }
  if (name.endsWith('.docx')) {
    return parseDocx(file)
  }
  if (file.type === 'text/plain' || name.endsWith('.txt')) {
    return file.text()
  }
  throw new Error('Unsupported format. Upload a PDF, DOCX, or TXT file.')
}

// pdf.js with its worker set, loaded on first use. The editor's preview draws with it too (#118).
export async function loadPdfjs() {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
  return pdfjsLib
}

async function parsePdf(file: File): Promise<string> {
  const pdfjsLib = await loadPdfjs()

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    // Link URLs are written into the runs first (#236), then the runs are
    // joined into lines and words by their positions.
    const items = content.items as PdfTextItem[]
    const strs = withLinkUrls(items, await page.getAnnotations())
    pages.push(pdfPageText(items.map((item, j) => (typeof item.str === 'string' ? { ...item, str: strs[j] } : item))))
  }

  const result = pages.join('\n\n').replace(/[ \t]{3,}/g, '  ').replace(/\n{3,}/g, '\n\n').trim()
  if (!result) throw new Error('No text found in PDF. Try a DOCX or TXT version.')
  return result
}

// The URL to write after a clickable link's text (#236), or null: web links
// only, as the email and phone are in the text already, and none when the
// text shows the URL. One with a space, quote or angle bracket, or over 2,048
// characters, is left out: a Word href can carry hidden text into the prompt.
function urlToAppend(url: unknown, text: string): string | null {
  return typeof url === 'string' && /^https?:\/\/[^\s"<>]{1,2048}$/i.test(url) && !text.toLowerCase().includes(urlCore(url)) ? url : null
}

// Each text item's string, with each clickable link's URL written after the
// last item it covers (#236): pdf.js leaves link annotations out of the text.
// An item is covered when it overlaps the link's rect across and its middle
// is inside it up and down: pdf.js often merges a linked word into the rest of
// its line, so the URL then goes after the line. A link wrapped over two lines
// is two links in a row with one URL over neighbouring text, and gets it once.
function withLinkUrls(items: object[], annotations: Array<{ rect?: number[]; url?: unknown }>): string[] {
  const strs = items.map((item) => ('str' in item && typeof item.str === 'string' ? item.str : ''))
  const links: Array<{ url: unknown; covered: number[] }> = []
  for (const { rect, url } of annotations) {
    if (!rect) continue
    const [x1, y1, x2, y2] = rect as [number, number, number, number]
    const covered = items.flatMap((item, i) => {
      const { transform, width = 0, height = 0 } = item as { transform?: number[]; width?: number; height?: number }
      const left = transform ? transform[4]! : NaN
      const y = transform ? transform[5]! + height / 2 : NaN
      return left < x2 && left + width > x1 && y >= y1 && y <= y2 ? [i] : []
    })
    const last = links[links.length - 1]
    const continues = last?.url === url && last.covered.length > 0 && covered.length > 0 && strs.slice(Math.max(...last.covered) + 1, Math.min(...covered)).every((s) => !s.trim())
    if (continues) last.covered.push(...covered)
    else links.push({ url, covered })
  }
  for (const { url, covered } of links) {
    const link = covered.length ? urlToAppend(url, covered.map((i) => strs[i]).join(' ')) : null
    if (link) strs[Math.max(...covered)] += ` (${link})`
  }
  return strs
}

// mammoth's extractRawText, with each hyperlink's URL written after its text
// (#236). extractRawText drops hrefs and takes no options, so this walks the
// document convertToHtml reads, the way mammoth/lib/raw-text.js does: as text
// pieces, each with its link's href. A link stored as a HYPERLINK field comes
// as a link per run, so neighbouring pieces with one href are one link. A link
// with no text (an icon) still gives its URL.
type DocxElement = { type: string; value?: string; href?: unknown; children?: DocxElement[] }
type DocxPiece = { text: string; href?: unknown }
function docxPieces(element: DocxElement, href?: unknown): DocxPiece[] {
  if (element.type === 'text') return [{ text: element.value ?? '', href }]
  if (element.type === 'tab') return [{ text: '\t', href }]
  const own = element.type === 'hyperlink' ? element.href : href
  const pieces = (element.children ?? []).flatMap((child) => docxPieces(child, own))
  if (element.type === 'hyperlink' && !pieces.length) pieces.push({ text: '', href: own })
  return element.type === 'paragraph' ? [...pieces, { text: '\n\n' }] : pieces
}

function docxText(document: DocxElement): string {
  const merged: DocxPiece[] = []
  for (const piece of docxPieces(document)) {
    const last = merged[merged.length - 1]
    if (piece.href !== undefined && last?.href === piece.href) last.text += piece.text
    else if (piece.href !== undefined || piece.text) merged.push({ ...piece })
  }
  return merged.map(({ text, href }) => {
    const url = href === undefined ? null : urlToAppend(href, text)
    return url ? `${text} (${url})` : text
  }).join('')
}

async function parseDocx(file: File): Promise<string> {
  const { default: mammoth } = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  let value = ''
  // Only the hook is wanted: handing back an empty document keeps mammoth
  // from rendering HTML or reading the images (a photo cost ~20 ms per MB) (#236).
  await mammoth.convertToHtml({ arrayBuffer }, {
    transformDocument: (doc: DocxElement) => {
      value = docxText(doc)
      return { ...doc, children: [] }
    },
  })
  const result = value.trim()
  if (!result) throw new Error('No text found in DOCX.')
  return result
}

export interface PdfTextItem {
  str?: string
  hasEOL?: boolean
  transform?: number[]
  width?: number
  height?: number
}

// One page's text with its real line breaks and word spaces. pdf.js hands
// back runs of glyphs, not words: a kerned heading comes as "N" + "orthern",
// so joining every run with a space prints "N orthern Arizona". Runs on the
// same baseline are joined with a space only where there is a visible gap
// between them; a baseline change or a run marked end-of-line starts a new line (#190).
export function pdfPageText(items: PdfTextItem[]): string {
  let out = ''
  let prev: { x: number; y: number; end: number; size: number } | null = null
  for (const item of items) {
    if (typeof item.str !== 'string') continue
    const t = item.transform ?? [1, 0, 0, 1, 0, 0]
    const x = t[4] ?? 0
    const y = t[5] ?? 0
    const size = Math.abs(t[3] ?? 0) || item.height || 10
    if (prev) {
      const sameLine = Math.abs(y - prev.y) < Math.max(prev.size, size) * 0.5
      if (!sameLine) {
        if (!out.endsWith('\n')) out += '\n'
      } else if (item.str && !/\s$/.test(out) && !/^\s/.test(item.str)) {
        // A gap wider than ~a fifth of the type size is a space between words (#190).
        if (x - prev.end > size * 0.2) out += ' '
      }
    }
    out += item.str
    if (item.hasEOL && !out.endsWith('\n')) out += '\n'
    prev = item.str || !prev ? { x, y, end: x + (item.width ?? 0), size } : prev
  }
  return out.replace(/[ \t]+\n/g, '\n')
}
