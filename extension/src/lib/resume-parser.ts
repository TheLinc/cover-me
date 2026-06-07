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

async function parsePdf(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    pages.push(text)
  }

  const result = pages.join('\n\n').replace(/\s{3,}/g, '\n').trim()
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
