// Shared with the website. Edit here, then run `node scripts/sync-pdf.mjs`,
// which copies this folder to web/lib/pdf/ (both builds fail on a stale copy).
//
// The Word copy of resume.ts's layout, built from real Word features (Title and
// Heading 1 styles, a bullet list, right tab stops for dates) so it edits
// cleanly in Word and Google Docs. Sizes and spacing follow the PDF's, in
// Times New Roman, which every machine has. Load it lazily: docx is big.
import {
  AlignmentType, BorderStyle, Document, HeadingLevel, LevelFormat, LineRuleType,
  Packer, Paragraph, Tab, TabStopType, TextRun,
} from 'docx'
import { resumeFileName } from './file-name'
import type { TailoredResume } from './types'

// Twips (1/20 pt). Letter page, the PDF's 54pt side margins.
const PT = 20
const MARGIN = 54 * PT
const CONTENT = (612 - 54 * 2) * PT  // 504pt: where the dates' tab stop sits
const FONT = 'Times New Roman'

const BULLETS = 'bullets'

// "Senior Engineer ⇥ 2020 – Present": left text, right text on the right margin.
function twoCol(left: string, right: string, style: 'bold' | 'italic', opts: { before?: number; after?: number; keepNext?: boolean } = {}) {
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: CONTENT }],
    spacing: { line: 13 * PT, lineRule: LineRuleType.AT_LEAST, before: opts.before, after: opts.after },
    keepNext: opts.keepNext,
    children: [
      new TextRun({ text: left || '', size: 21, bold: style === 'bold', italics: style === 'italic' }),
      new TextRun({ children: [new Tab(), right || ''], size: 21 }),
    ],
  })
}

const bullet = (text: string) => new Paragraph({
  numbering: { reference: BULLETS, level: 0 },
  spacing: { after: 1 * PT },
  children: [new TextRun(String(text ?? ''))],
})

const heading = (title: string) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(title)] })

export function buildResumeDocx(resume: TailoredResume): Promise<Blob> {
  const body: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(resume.name || 'Resume')] }),
  ]

  const contact = [resume.phone, resume.email, resume.website].filter(Boolean)
  if (contact.length) {
    body.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(contact.join('   |   '))] }))
  }

  if (resume.summary) body.push(heading('SUMMARY'), new Paragraph(resume.summary))

  if (resume.experience?.length) {
    body.push(heading('EXPERIENCE'))
    resume.experience.forEach((exp, i) => {
      body.push(
        twoCol(exp.title, exp.dates, 'bold', { before: i ? 5 * PT : 0, keepNext: true }),
        twoCol(exp.company, exp.location, 'italic', { after: 2 * PT, keepNext: !!exp.bullets?.length }),
        ...(exp.bullets ?? []).map(bullet),
      )
    })
  }

  if (resume.projects?.length) {
    body.push(heading('PROJECTS'))
    resume.projects.forEach((proj, i) => {
      body.push(
        new Paragraph({
          spacing: { line: 13 * PT, lineRule: LineRuleType.AT_LEAST, before: i ? 5 * PT : 0 },
          keepNext: !!proj.bullets?.length,
          children: [new TextRun({ text: proj.name || '', bold: true, size: 21 })],
        }),
        ...(proj.bullets ?? []).map(bullet),
      )
    })
  }

  if (resume.education?.length) {
    body.push(heading('EDUCATION'))
    resume.education.forEach((edu, i) => {
      body.push(
        twoCol(edu.institution, edu.dates, 'bold', { before: i ? 5 * PT : 0, keepNext: true }),
        twoCol(edu.degree, edu.location, 'italic', { after: 2 * PT, keepNext: !!edu.bullets?.length }),
        ...(edu.bullets ?? []).map(bullet),
      )
    })
  }

  if (resume.certifications?.length) body.push(heading('CERTIFICATIONS'), ...resume.certifications.map(bullet))

  if (resume.skills) body.push(heading('SKILLS'), new Paragraph(resume.skills))

  // Other sections (publications, volunteer work…), as the resume had them
  for (const section of resume.otherSections ?? []) {
    if (!section.lines?.length) continue
    body.push(heading(String(section.heading ?? '').toUpperCase()), ...section.lines.map(bullet))
  }

  const doc = new Document({
    creator: resume.name || undefined,
    title: resume.name ? `${resume.name} – Resume` : 'Resume',
    styles: {
      default: {
        // 10pt on 12pt lines, as the PDF sets its body text.
        document: {
          run: { font: FONT, size: 20 },
          paragraph: { spacing: { before: 0, after: 0, line: 12 * PT, lineRule: LineRuleType.AT_LEAST } },
        },
        title: {
          run: { font: FONT, size: 52, bold: true, color: '000000' },
          paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 2 * PT } },
        },
        heading1: {
          run: { font: FONT, size: 22, bold: true, color: '000000' },
          paragraph: {
            spacing: { before: 8 * PT, after: 3 * PT },
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000', space: 1 } },
            keepNext: true,
          },
        },
      },
    },
    numbering: {
      config: [{
        reference: BULLETS,
        // The PDF's bullet sits 4pt in and its text hangs at 14pt.
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 14 * PT, hanging: 10 * PT } } },
        }],
      }],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 612 * PT, height: 792 * PT },
          margin: { top: 36 * PT, bottom: 36 * PT, left: MARGIN, right: MARGIN },
        },
      },
      children: body,
    }],
  })
  return Packer.toBlob(doc)
}

export async function downloadTailoredResumeDocx(resume: TailoredResume, jobTitle?: string): Promise<void> {
  const url = URL.createObjectURL(await buildResumeDocx(resume))
  const a = document.createElement('a')
  a.href = url
  a.download = resumeFileName(resume, jobTitle, 'docx')
  a.click()
  // The click starts the download before this runs; revoking later frees the blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
