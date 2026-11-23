import { writeFileSync } from 'node:fs'
import { AlignmentType, Document, Packer, Paragraph, TabStopType, TextRun } from 'docx'
import { CASES } from './eval/fixtures'

const out = process.argv[2]!
const resumes = [...new Set(CASES.map((c) => c.resumeText))]
const run = (text: string, o: { bold?: boolean; size?: number } = {}) => new TextRun({ text, font: 'Calibri', kern: 16, size: o.size ?? 21, bold: o.bold })
for (const [i, text] of resumes.entries()) {
  const lines = text.split('\n')
  const children = lines.map((line, n) => {
    if (n === 0) return new Paragraph({ alignment: AlignmentType.CENTER, children: [run(line, { bold: true, size: 36 })] })
    if (/^- /.test(line)) return new Paragraph({ bullet: { level: 0 }, alignment: AlignmentType.JUSTIFIED, children: [run(line.slice(2))] })
    if (line && line === line.toUpperCase() && /[A-Z]/.test(line)) return new Paragraph({ spacing: { before: 160 }, children: [run(line, { bold: true, size: 24 })] })
    const m = line.match(/^(.*?)\s*\(([^()]*\d{4}[^()]*)\)$/)
    if (m) return new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: 9000 }], children: [run(m[1]!, { bold: true }), run(`\t${m[2]}`)] })
    return new Paragraph({ children: [run(line)] })
  })
  writeFileSync(`${out}/word${String(i).padStart(2, '0')}.docx`, await Packer.toBuffer(new Document({ sections: [{ properties: { page: { margin: { top: 900, bottom: 900, left: 1080, right: 1080 } } }, children }] })))
}
console.log(resumes.length)
