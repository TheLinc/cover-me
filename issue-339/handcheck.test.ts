import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { test, vi } from 'vitest'
import { parseResume } from './resume-parser'
import { sectionOrderFromText } from './ai/resume-parse'
import { CASES } from '../../eval/fixtures'

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: new URL('../../node_modules/pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href }))

test('handcheck', async () => {
  const S = process.env.HC_S!
  const label = process.env.HC_LABEL!
  const parsed = [...new Map(CASES.map((c) => [c.resumeText, c.parsed])).values()]
  const summary: string[] = []
  for (const dir of ['pdfs-word', 'pdfs-latex', 'pdfs-gdocs']) {
    mkdirSync(`${S}/out-${label}/${dir}`, { recursive: true })
    for (const name of readdirSync(`${S}/${dir}`)) {
      const text = await parseResume(new File([readFileSync(`${S}/${dir}/${name}`)], name, { type: 'application/pdf' }))
      writeFileSync(`${S}/out-${label}/${dir}/${name}.txt`, text)
      const m = name.match(/^word(\d+)\.pdf$/)
      summary.push(`${dir}/${name}: ${text.split('\n').length} lines${m ? `, order ${sectionOrderFromText(parsed[Number(m[1])]!, text) ? 'found' : 'NULL'}` : ''}`)
    }
  }
  writeFileSync(`${S}/out-${label}/summary.txt`, summary.join('\n'))
}, 120000)
