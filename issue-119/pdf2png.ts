import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
const require = createRequire(import.meta.url)
const { createCanvas } = require('../node_modules/.pnpm/@napi-rs+canvas@0.1.100/node_modules/@napi-rs/canvas')
const fontDir = 'F:/worktrees/cover-me/t3-9db596f0-57d0fb1da9e38ecb/extension/node_modules/pdfjs-dist/standard_fonts/'
for (const file of process.argv.slice(2)) {
  const pdf = await getDocument({ data: new Uint8Array(readFileSync(file)), verbosity: 0, standardFontDataUrl: fontDir }).promise
  const page = await pdf.getPage(1)
  const vp = page.getViewport({ scale: 1.25 })
  const canvas = createCanvas(vp.width, vp.height)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, vp.width, vp.height)
  await page.render({ canvasContext: ctx as never, viewport: vp, canvas: canvas as never }).promise
  writeFileSync(file.replace(/\.pdf$/, '.png'), canvas.toBuffer('image/png'))
}
