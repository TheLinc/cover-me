import { useEffect, useRef } from 'react'
import { loadPdfjs } from '../lib/resume-parser'

// The resume PDF drawn with pdf.js, one canvas per page. Each new version
// draws off screen and replaces the old pages only once it's done, so typing
// doesn't blank the preview or reset its scroll the way reloading Chrome's
// PDF viewer did.
export default function PdfPreview({ pdf }: { pdf: ArrayBuffer | null }) {
  const box = useRef<HTMLDivElement>(null)
  const latest = useRef(0)

  useEffect(() => {
    const el = box.current
    if (!pdf || !el) return
    let width = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    const draw = async () => {
      const run = ++latest.current
      const lib = await loadPdfjs()
      // getDocument takes ownership of its buffer, so it gets a copy.
      const doc = await lib.getDocument({ data: new Uint8Array(pdf.slice(0)) }).promise
      try {
        const pages: HTMLCanvasElement[] = []
        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n)
          const viewport = page.getViewport({ scale: (width / page.getViewport({ scale: 1 }).width) * devicePixelRatio })
          const canvas = document.createElement('canvas')
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          canvas.setAttribute('aria-hidden', 'true')
          await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
          if (run !== latest.current) return // a newer version is drawing
          pages.push(canvas)
        }
        el.replaceChildren(...pages)
      } finally {
        void doc.destroy()
      }
    }
    // Drawn again when the column changes width, a moment after it settles.
    const observer = new ResizeObserver(([entry]) => {
      const w = Math.floor(entry.contentRect.width)
      if (w === width || w === 0) return
      const first = width === 0
      width = w
      clearTimeout(timer)
      timer = setTimeout(() => void draw().catch(() => {}), first ? 0 : 150)
    })
    observer.observe(el)
    return () => {
      observer.disconnect()
      clearTimeout(timer)
    }
  }, [pdf])

  return <div ref={box} className="ed-pages" role="img" aria-label="Resume PDF preview" />
}
