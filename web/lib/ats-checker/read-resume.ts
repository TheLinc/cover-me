export interface ResumeFile {
  text: string
  pages?: number
}

export async function readResumeFile(file: File): Promise<ResumeFile> {
  const name = file.name.toLowerCase()
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
    return readPdf(file).catch(() => {
      throw new Error(`Couldn't read ${file.name}. If it has a password, save a copy without one, or paste the text instead.`)
    })
  }
  if (name.endsWith('.docx')) {
    const { default: mammoth } = await import('mammoth')
    return { text: (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value.trim() }
  }
  if (file.type === 'text/plain' || name.endsWith('.txt')) return { text: (await file.text()).trim() }
  throw new Error('Upload a PDF, a Word file (.docx) or a text file.')
}

async function readPdf(file: File): Promise<ResumeFile> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString()
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  const pdf = await task.promise.catch(async (err: unknown) => {
    await task.destroy()
    throw err
  })
  const pages: string[] = []
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const { items } = await (await pdf.getPage(i)).getTextContent()
      pages.push(items.map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '')).join(''))
    }
  } finally {
    await pdf.destroy()
  }
  return { text: pages.join('\n\n').replace(/[ \t]{2,}/g, ' ').replace(/ *\n */g, '\n').trim(), pages: pages.length }
}
