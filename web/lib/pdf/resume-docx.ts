// Shared with the website. Edit here, then run `node scripts/sync-pdf.mjs`,
// which copies this folder to web/lib/pdf/ (both builds fail on a stale copy).
//
// The Word copy of resume.ts's layout, built from real Word features (Title and
// Heading 1 styles, a bullet list, right tab stops for dates) so it edits
// cleanly in Word and Google Docs. Fonts, sizes and spacing follow the PDF's
// template (#119). Load it lazily: docx is big (#120).
import {
  AlignmentType, BorderStyle, Document, HeadingLevel, LevelFormat, LineRuleType,
  Packer, Paragraph, Tab, TabStopType, TextRun,
} from 'docx'
import { contactParts } from './contact'
import { resumeFileName, saveFile } from './file-name'
import { GPA_LINE, SKILL_GROUP } from './layout-rules'
import { resumeStyle, type RGB } from './resume'
import { orderedSections, type StandardSection } from './sections'
import type { TailoredResume } from './types'

// Twips (1/20 pt) on a Letter page (#120).
const PT = 20
// Helvetica isn't on Windows; Arial has the same metrics, and Word swaps one for the other (#119).
const FONTS = { times: 'Times New Roman', helvetica: 'Arial' }
const hex = (c: RGB) => c.map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase()

const BULLETS = 'bullets'

const bullet = (text: string) => new Paragraph({
  numbering: { reference: BULLETS, level: 0 },
  spacing: { after: 1 * PT },
  children: [new TextRun(String(text ?? ''))],
})

const heading = (title: string) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(title)] })

export function buildResumeDocx(resume: TailoredResume): Promise<Blob> {
  const st = resumeStyle(resume)
  const font = FONTS[st.font]
  const align = st.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT
  const content = (612 - st.margin * 2) * PT
  const gap = st.entryGap * PT

  // "Senior Engineer ⇥ 2020 – Present": left text, right text on the right margin (#120).
  const twoCol = (left: string, right: string, style: 'bold' | 'italic', opts: { before?: number; after?: number; keepNext?: boolean } = {}) => new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: content }],
    spacing: { line: st.entryStep * PT, lineRule: LineRuleType.AT_LEAST, before: opts.before, after: opts.after },
    keepNext: opts.keepNext,
    children: [
      new TextRun({ text: left || '', size: st.entry * 2, bold: style === 'bold', italics: style === 'italic' }),
      new TextRun({ children: [new Tab(), right || ''], size: st.entry * 2 }),
    ],
  })

  const body: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(resume.name || 'Resume')] }),
  ]

  if (resume.headline?.trim()) {
    body.push(new Paragraph({ alignment: align, children: [new TextRun({ text: resume.headline.trim(), size: st.headline.size * 2 })] }))
  }
  const contact = contactParts(resume)
  if (contact.length) {
    body.push(new Paragraph({ alignment: align, children: [new TextRun({ text: contact.join(st.contact.sep), size: st.contact.size * 2 })] }))
  }

  // "Name | subtitle ⇥ link": a project or an open-source/award entry (#190).
  // Name and link or dates, then the subtitle in italics under it, as in the PDF (#190).
  const entryHeader = (name: string, subtitle: string | undefined, right: string | undefined, before: number, keepNext: boolean) => [
    twoCol(name, right ?? '', 'bold', { before, keepNext: keepNext || !!subtitle }),
    ...(subtitle ? [twoCol(subtitle, '', 'italic', { keepNext })] : []),
  ]

  // Each section, in the order the user set (sections.ts) (#118).
  const add: Record<StandardSection, () => void> = {
    summary: () => {
      if (resume.summary) body.push(heading('SUMMARY'), new Paragraph(resume.summary))
    },
    experience: () => {
      if (!resume.experience?.length) return
      body.push(heading('EXPERIENCE'))
      resume.experience.forEach((exp, i) => {
        body.push(
          twoCol(exp.title, exp.dates, 'bold', { before: i ? gap : 0, keepNext: true }),
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
          ...entryHeader(proj.name || '', proj.tech, proj.link, i ? gap : 0, !!proj.bullets?.length),
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
          twoCol(edu.institution, edu.dates, 'bold', { before: i ? gap : 0, keepNext: true }),
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
      // Other sections (publications, volunteer work…), as the resume had them (#118)
      const section = resume.otherSections![s.index]
      // Its entries, then any lines outside an entry (#190).
      const entries = section.entries?.filter((e) => e?.name) ?? []
      const lines = section.lines ?? []
      if (!entries.length && !lines.length) continue
      body.push(heading(String(section.heading ?? '').toUpperCase()))
      entries.forEach((e, i) => body.push(
        ...entryHeader(e.name, e.subtitle, e.dates || e.link, i ? gap : 0, !!e.bullets?.length || !!(e.dates && e.link)),
        ...(e.dates && e.link ? [new Paragraph({ keepNext: !!e.bullets?.length, children: [new TextRun({ text: e.link, italics: true })] })] : []),
        ...(e.bullets ?? []).map(bullet),
      ))
      body.push(...lines.map(bullet))
    }
  }

  const doc = new Document({
    creator: resume.name || undefined,
    title: resume.name ? `${resume.name} – Resume` : 'Resume',
    styles: {
      default: {
        document: {
          run: { font, size: st.body * 2 },
          paragraph: { spacing: { before: 0, after: 0, line: st.lineHeight * PT, lineRule: LineRuleType.AT_LEAST } },
        },
        title: {
          run: { font, size: st.name.size * 2, bold: st.name.bold, color: '000000' },
          paragraph: { alignment: align, spacing: { after: 2 * PT } },
        },
        // The PDF's gaps run baseline to baseline; Word's sit between lines, so each is a line's worth less (#119).
        heading1: {
          run: { font, size: st.heading.size * 2, bold: true, color: hex(st.heading.colour) },
          paragraph: {
            spacing: { before: (st.heading.before - 2) * PT, after: (st.heading.after - 6) * PT },
            // Border widths are in eighths of a point, 2 at the thinnest (http://officeopenxml.com/WPborders.php).
            border: { bottom: { style: BorderStyle.SINGLE, size: Math.max(2, Math.round(st.heading.rule.width * 8)), color: hex(st.heading.rule.colour), space: 1 } },
            keepNext: true,
          },
        },
      },
    },
    numbering: {
      config: [{
        reference: BULLETS,
        // The PDF's bullet sits 4pt in and its text hangs at 14pt (#120).
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
          // The PDF's top is the name's baseline, so the page margin sits above it (#119).
          margin: { top: (st.top - 16) * PT, bottom: (st.bottom - 12) * PT, left: st.margin * PT, right: st.margin * PT },
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
