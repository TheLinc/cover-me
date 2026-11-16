import { describe, expect, test, vi } from 'vitest'
import { jsPDF } from 'jspdf'
import { Document, ExternalHyperlink, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from 'docx'
import { parseResume } from './resume-parser'

// Node shims for what the popup gets from the browser: the worker as a file
// URL (Vite's ?url is a server path), and mammoth's browser build, which reads
// { arrayBuffer } where its Node build reads { buffer }.
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: new URL('../../node_modules/pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href }))
vi.mock('mammoth', async (importOriginal) => {
  const { default: m } = await importOriginal<{ default: typeof import('mammoth') }>()
  const shim = <O,>(fn: (input: { buffer: ArrayBuffer }, options?: O) => unknown) => (input: { arrayBuffer: ArrayBuffer }, options?: O) => fn({ buffer: input.arrayBuffer }, options)
  return { default: { ...m, convertToHtml: shim(m.convertToHtml as never), extractRawText: shim(m.extractRawText as never) } }
})

const PROJECT_URL = 'https://github.com/ada/cover-me'

function pdfFile(draw: (doc: jsPDF) => void): File {
  const doc = new jsPDF()
  draw(doc)
  return new File([doc.output('arraybuffer')], 'resume.pdf', { type: 'application/pdf' })
}

async function docxFile(children: Array<Paragraph | Table>): Promise<File> {
  const buffer = await Packer.toBuffer(new Document({ sections: [{ children }] }))
  return new File([new Uint8Array(buffer)], 'resume.docx')
}

describe('parseResume keeps clickable links (#236)', () => {
  test('PDF: a clickable project name is followed by its URL', async () => {
    const text = await parseResume(pdfFile((doc) => {
      doc.text('Ada Lovelace', 10, 10)
      doc.text('Projects', 10, 30)
      doc.textWithLink('Cover Me', 10, 40, { url: PROJECT_URL })
      doc.text('Built a resume tailoring tool', 10, 50)
    }))
    expect(text).toContain(`Cover Me (${PROJECT_URL})`)
  })

  test('PDF: a link whose text already shows the URL, and mailto links, add nothing', async () => {
    const text = await parseResume(pdfFile((doc) => {
      doc.textWithLink('ada@x.co', 10, 10, { url: 'mailto:ada@x.co' })
      doc.textWithLink('github.com/ada', 10, 20, { url: 'https://www.github.com/ada/' })
    }))
    expect(text).toBe('ada@x.co github.com/ada')
  })

  test('PDF: a URL linked in two places is written after each', async () => {
    const text = await parseResume(pdfFile((doc) => {
      doc.textWithLink('Portfolio', 10, 10, { url: 'https://ada.dev' })
      doc.text('Projects', 10, 30)
      doc.textWithLink('Live site', 10, 40, { url: 'https://ada.dev' })
    }))
    expect(text).toBe('Portfolio (https://ada.dev/) Projects Live site (https://ada.dev/)')
  })

  test('PDF: a link wrapped over two lines gets its URL once, at the end', async () => {
    const text = await parseResume(pdfFile((doc) => {
      doc.textWithLink('Cover', 10, 10, { url: PROJECT_URL })
      doc.textWithLink('Me', 10, 20, { url: PROJECT_URL })
    }))
    expect(text).toBe(`Cover Me (${PROJECT_URL})`)
  })

  test('Word: a clickable project name is followed by its URL', async () => {
    const text = await parseResume(await docxFile([
      new Paragraph('Projects'),
      new Paragraph({ children: [new ExternalHyperlink({ link: PROJECT_URL, children: [new TextRun('Cover Me')] }), new TextRun(' – a tool')] }),
      new Paragraph({ children: [new ExternalHyperlink({ link: 'mailto:ada@x.co', children: [new TextRun('ada@x.co')] })] }),
    ]))
    expect(text).toBe(`Projects\n\nCover Me (${PROJECT_URL}) – a tool\n\nada@x.co`)
  })

  test('Word: a file with no links gives the text extractRawText gave', async () => {
    const file = await docxFile([
      new Paragraph('Ada Lovelace'),
      new Paragraph({ children: [new TextRun('Engineer'), new TextRun({ text: 'Acme', bold: true })] }),
      new Table({ rows: [new TableRow({ children: [new TableCell({ children: [new Paragraph('Python')] }), new TableCell({ children: [new Paragraph('SQL')] })] })] }),
      new Paragraph({ text: 'Shipped things', bullet: { level: 0 } }),
    ])
    const { default: mammoth } = await import('mammoth')
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    expect(await parseResume(file)).toBe(value.trim())
  })
})
