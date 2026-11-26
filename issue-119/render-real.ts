import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { tailoredResumePdf } from '../src/lib/pdf/resume'
import { longResume, shortResume } from './real-fixtures'
const require = createRequire(import.meta.url)
const { createCanvas } = require('../node_modules/.pnpm/@napi-rs+canvas@0.1.100/node_modules/@napi-rs/canvas')
const out = process.argv[2]
const fontDir = 'F:/worktrees/cover-me/t3-9db596f0-57d0fb1da9e38ecb/extension/node_modules/pdfjs-dist/standard_fonts/'
for (const t of ['classic', 'modern', 'compact', 'minimal']) {
  for (const [label, r] of [['long', longResume()], ['short', shortResume()]] as const) {
    const bytes = new Uint8Array(tailoredResumePdf({ ...r, template: t as never }).output('arraybuffer'))
    writeFileSync(`${out}/${t}-${label}.pdf`, bytes)
    const pdf = await getDocument({ data: bytes, verbosity: 0, standardFontDataUrl: fontDir }).promise
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p)
      const vp = page.getViewport({ scale: 1.5 })
      const canvas = createCanvas(vp.width, vp.height)
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, vp.width, vp.height)
      await page.render({ canvasContext: ctx as never, viewport: vp, canvas: canvas as never }).promise
      writeFileSync(`${out}/${t}-${label}-p${p}.png`, canvas.toBuffer('image/png'))
    }
    console.log(t, label, pdf.numPages)
  }
}
