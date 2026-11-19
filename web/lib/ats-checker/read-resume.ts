export async function readResumeFile(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return readPdf(file)
  if (name.endsWith('.docx')) {
    const { default: mammoth } = await import('mammoth')
    return (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value.trim()
  }
  if (file.type === 'text/plain' || name.endsWith('.txt')) return (await file.text()).trim()
  throw new Error('Upload a PDF, a Word file (.docx) or a text file.')
}

async function readPdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
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
  return pages.join('\n\n').replace(/[ \t]{2,}/g, ' ').replace(/ *\n */g, '\n').trim()
}
