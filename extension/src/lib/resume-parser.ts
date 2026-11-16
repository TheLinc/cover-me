// Worker URL is a static asset reference (just a string) — keeping it static is fine.
// The heavy pdfjs-dist and mammoth libraries are loaded dynamically only when needed.
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

// pdf.js with its worker set, loaded on first use. The editor's preview draws with it too.
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
    const text = withLinkUrls(content.items, await page.getAnnotations()).join(' ')
    pages.push(text)
  }

  const result = pages.join('\n\n').replace(/\s{3,}/g, '\n').trim()
  if (!result) throw new Error('No text found in PDF. Try a DOCX or TXT version.')
  return result
}

// A clickable link's URL, for writing after its text (#236): web links only,
// as the email and phone are in the text already, and none when the text
// shows the URL.
function linkUrl(url: unknown, text: string): string | null {
  return typeof url === 'string' && /^https?:\/\//i.test(url) && !text.toLowerCase().includes(urlCore(url)) ? url : null
}

// Each text item's string, with each clickable link's URL written after the
// last item it covers (#236): pdf.js leaves link annotations out of the text.
// An item is covered when its centre is inside the link's rect; a link
// wrapped over two lines has a rect per line, and one URL.
function withLinkUrls(items: object[], annotations: Array<{ rect?: number[]; url?: unknown }>): string[] {
  const strs = items.map((item) => ('str' in item && typeof item.str === 'string' ? item.str : ''))
  const covered = new Map<unknown, number[]>()
  for (const { rect, url } of annotations) {
    if (!rect) continue
    const [x1, y1, x2, y2] = rect as [number, number, number, number]
    const inside = items.flatMap((item, i) => {
      const { transform: t, width = 0, height = 0 } = item as { transform?: number[]; width?: number; height?: number }
      const x = t ? t[4]! + width / 2 : NaN
      const y = t ? t[5]! + height / 2 : NaN
      return x >= x1 && x <= x2 && y >= y1 && y <= y2 ? [i] : []
    })
    covered.set(url, [...(covered.get(url) ?? []), ...inside])
  }
  for (const [url, at] of covered) {
    const link = at.length ? linkUrl(url, at.map((i) => strs[i]).join(' ')) : null
    if (link) strs[Math.max(...at)] += ` (${link})`
  }
  return strs
}

// mammoth's extractRawText, with each hyperlink's URL written after its text
// (#236). extractRawText drops hrefs and takes no options, so this walks the
// document convertToHtml reads, the way mammoth/lib/raw-text.js does.
type DocxElement = { type: string; value?: string; href?: unknown; children?: DocxElement[] }
function docxText(element: DocxElement): string {
  if (element.type === 'text') return element.value ?? ''
  if (element.type === 'tab') return '\t'
  const text = (element.children ?? []).map(docxText).join('')
  const link = element.type === 'hyperlink' ? linkUrl(element.href, text) : null
  return text + (link ? ` (${link})` : '') + (element.type === 'paragraph' ? '\n\n' : '')
}

async function parseDocx(file: File): Promise<string> {
  const { default: mammoth } = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  let value = ''
  await mammoth.convertToHtml({ arrayBuffer }, { transformDocument: (doc: DocxElement) => ((value = docxText(doc)), doc) })
  const result = value.trim()
  if (!result) throw new Error('No text found in DOCX.')
  return result
}
