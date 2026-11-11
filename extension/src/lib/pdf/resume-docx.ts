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
import { contactParts } from './contact'
import { resumeFileName, saveFile } from './file-name'
import { GPA_LINE, SKILL_GROUP } from './layout-rules'
import { orderedSections, type StandardSection } from './sections'
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

  if (resume.headline?.trim()) {
    body.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: resume.headline.trim(), size: 23 })] }))
  }
  const contact = contactParts(resume)
  if (contact.length) {
    body.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: contact.join('  |  '), size: 19 })] }))
  }

  // "Name | subtitle ⇥ link": a project or an open-source/award entry.
  const entryHeader = (name: string, subtitle: string | undefined, right: string | undefined, before: number, keepNext: boolean) => new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: CONTENT }],
    spacing: { line: 13 * PT, lineRule: LineRuleType.AT_LEAST, before },
    keepNext,
    children: [
      new TextRun({ text: name || '', bold: true, size: 21 }),
      ...(subtitle ? [new TextRun({ text: `  |  ${subtitle}`, italics: true, size: 21 })] : []),
      ...(right ? [new TextRun({ children: [new Tab(), right], size: 21 })] : []),
    ],
  })

  // Each section, in the order the user set (sections.ts).
  const add: Record<StandardSection, () => void> = {
    summary: () => {
      if (resume.summary) body.push(heading('SUMMARY'), new Paragraph(resume.summary))
    },
    experience: () => {
      if (!resume.experience?.length) return
      body.push(heading('EXPERIENCE'))
      resume.experience.forEach((exp, i) => {
        body.push(
          twoCol(exp.title, exp.dates, 'bold', { before: i ? 5 * PT : 0, keepNext: true }),
          twoCol(exp.company, exp.location, 'italic', { after: 2 * PT, keepNext: !!exp.bullets?.length }),
          ...(exp.bullets ?? []).map(bullet),
        )
      })
    },
    projects: () => {
      if (!resume.projects?.length) return
      body.push(heading('PROJECTS'))
      resume.projects.forEach((proj, i) => {
        body.push(
          entryHeader(proj.name || '', proj.tech, proj.link, i ? 5 * PT : 0, !!proj.bullets?.length),
          ...(proj.bullets ?? []).map(bullet),
        )
      })
    },
    education: () => {
      if (!resume.education?.length) return
      body.push(heading('EDUCATION'))
      resume.education.forEach((edu, i) => {
        const gpa = (edu.bullets ?? []).filter((b) => GPA_LINE.test(b.trim()))
        const rest = (edu.bullets ?? []).filter((b) => !GPA_LINE.test(b.trim()))
        body.push(
          twoCol(edu.institution, edu.dates, 'bold', { before: i ? 5 * PT : 0, keepNext: true }),
          twoCol([edu.degree, ...gpa.map((g) => g.trim())].filter(Boolean).join('  |  '), edu.location, 'italic', { after: 2 * PT, keepNext: !!rest.length }),
          ...rest.map(bullet),
        )
      })
    },
    certifications: () => {
      if (resume.certifications?.length) body.push(heading('CERTIFICATIONS'), ...resume.certifications.map(bullet))
    },
    skills: () => {
      if (!resume.skills) return
      body.push(heading('SKILLS'))
      for (const group of resume.skills.split(/\n+/).map((l) => l.trim()).filter(Boolean)) {
        const m = SKILL_GROUP.exec(group)
        body.push(new Paragraph({
          spacing: { after: 1 * PT },
          children: m ? [new TextRun({ text: `${m[1].trim()}: `, bold: true }), new TextRun(m[2])] : [new TextRun(group)],
        }))
      }
    },
  }
  for (const s of orderedSections(resume)) {
    if (s.key !== 'other') add[s.key]()
    else {
      // Other sections (publications, volunteer work…), as the resume had them
      const section = resume.otherSections![s.index]
      const entries = section.entries?.filter((e) => e?.name) ?? []
      if (entries.length) {
        body.push(heading(String(section.heading ?? '').toUpperCase()))
        entries.forEach((e, i) => body.push(
          entryHeader(e.name, e.subtitle, e.dates || e.link, i ? 5 * PT : 0, !!e.bullets?.length || !!(e.dates && e.link)),
          ...(e.dates && e.link ? [new Paragraph({ keepNext: !!e.bullets?.length, children: [new TextRun({ text: e.link, italics: true })] })] : []),
          ...(e.bullets ?? []).map(bullet),
        ))
      } else if (section.lines?.length) body.push(heading(String(section.heading ?? '').toUpperCase()), ...section.lines.map(bullet))
    }
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
  saveFile(await buildResumeDocx(resume), resumeFileName(resume, jobTitle, 'docx'))
}
