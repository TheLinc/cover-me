// Worker URL is a static asset reference (just a string) — keeping it static is fine.
// The heavy pdfjs-dist and mammoth libraries are loaded dynamically only when needed.
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

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
    pages.push(pdfPageText(content.items as PdfTextItem[]))
  }

  const result = pages.join('\n\n').replace(/[ \t]{3,}/g, '  ').replace(/\n{3,}/g, '\n\n').trim()
  if (!result) throw new Error('No text found in PDF. Try a DOCX or TXT version.')
  return result
}

async function parseDocx(file: File): Promise<string> {
  const { default: mammoth } = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const { value } = await mammoth.extractRawText({ arrayBuffer })
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
// between them; a baseline change or a run marked end-of-line starts a new line.
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
        // A gap wider than ~a fifth of the type size is a space between words.
        if (x - prev.end > size * 0.2) out += ' '
      }
    }
    out += item.str
    if (item.hasEOL && !out.endsWith('\n')) out += '\n'
    prev = item.str || !prev ? { x, y, end: x + (item.width ?? 0), size } : prev
  }
  return out.replace(/[ \t]+\n/g, '\n')
}
