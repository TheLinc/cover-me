// Shared with the website. Edit here, then run `node scripts/sync-pdf.mjs`,
// which copies this folder to web/lib/pdf/ (both builds fail on a stale copy).
//
// The Word copy of resume.ts's layout, built from real Word features (Title and
// Heading 1 styles, a bullet list, right tab stops for dates) so it edits
// cleanly in Word and Google Docs. Fonts, sizes and spacing follow the PDF's
// template (#119). Load it lazily: docx is big (#120).
import {
  AlignmentType, BorderStyle, Document, HeadingLevel, LevelFormat, LineRuleType,
  Packer, Paragraph, SectionType, Tab, TabStopType, TextRun,
} from 'docx'
import { resumeFileName, saveFile } from './file-name'
import { GPA_LINE, SKILL_GROUP } from './layout-rules'
import { contactLines, fitsBeside, nameSize, noteRoom, resumeStyle, type RGB } from './resume'
import { orderedSections, type StandardSection } from './sections'
import type { TailoredResume } from './types'

// Twips (1/20 pt) on a Letter page (#120).
const PT = 20
// Helvetica isn't on Windows; Arial has the same metrics, and Word swaps one for the other (#119).
const FONTS = { times: 'Times New Roman', helvetica: 'Arial' }
const hex = (c: RGB) => c.map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase()

// Where Word puts the baseline, measured in Word 365 exports: 80% of the way down an
// exact-height line, and 0.94 of the font size down a single-spaced one, with 0.21 under it (#119).
const EXACT_UP = 0.8
const SINGLE_UP = 0.94
const SINGLE_DOWN = 0.21

const BULLETS = 'bullets'

export function buildResumeDocx(resume: TailoredResume): Promise<Blob> {
  const st = resumeStyle(resume)
  const font = FONTS[st.font]
  const align = st.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT
  const content = (612 - st.margin * 2) * PT
  const LH = st.lineHeight
  const ruleWidth = Math.max(2, Math.round(st.heading.rule.width * 8))
  const name = nameSize(resume)

  // The PDF steps from baseline to baseline; Word stacks line boxes. Each paragraph gets the
  // space before it that lands its first baseline where the PDF's is. A one-line paragraph can
  // shrink its line to the font size to fit a tight gap; a gap still too tight for Word is made
  // up at the next one (#119).
  let advance = 0
  let under = SINGLE_DOWN * name
  let owed = 0
  const place = (line: number, then: number, fit?: number) => {
    const room = advance - under - owed
    const L = fit ? Math.min(line, Math.max(fit, room / EXACT_UP)) : line
    const before = room - EXACT_UP * L
    owed = Math.max(0, -before)
    under = (1 - EXACT_UP) * L
    advance = then
    return { before: Math.round(Math.max(0, before) * PT), after: 0, line: Math.round(L * PT), lineRule: LineRuleType.EXACT }
  }

  // "Senior Engineer ⇥ 2020 – Present": left text, right text on the right margin (#120). The
  // right indent wraps a long title short of the dates, as the PDF does; Word still sets a right
  // tab beyond the indent (#119).
  const twoCol = (left: string, right: string, style: 'bold' | 'italic', then: number, keepNext?: boolean) => new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: content }],
    indent: { right: Math.round(noteRoom(resume, right) * PT) },
    spacing: place(st.entryStep, then, st.entry),
    keepNext,
    children: [
      new TextRun({ text: left || '', size: st.entry * 2, bold: style === 'bold', italics: style === 'italic' }),
      new TextRun({ children: [new Tab(), right || ''], size: st.entry * 2 }),
    ],
  })

  // keepLines: the PDF never splits a bullet or a skills line across pages (#119).
  const bullet = (text: string) => new Paragraph({
    numbering: { reference: BULLETS, level: 0 },
    keepLines: true,
    spacing: place(LH, LH + 1),
    children: [new TextRun(String(text ?? ''))],
  })

  // The PDF draws its rule 3pt under the heading's baseline, and the next line sits its gap below that (#119).
  const heading = (title: string) => {
    advance += st.heading.before
    const spacing = place(st.heading.size * 1.2, 3 + st.heading.after, st.heading.size)
    under += 1 + ruleWidth / 8
    return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing, children: [new TextRun(title)] })
  }

  const entryGap = () => { advance += st.entryGap }

  const top: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(resume.name || 'Resume')] }),
  ]
  advance = st.name.after

  if (resume.headline?.trim()) {
    top.push(new Paragraph({
      alignment: align,
      spacing: place(st.headline.size * 1.2, st.headline.after, st.headline.size),
      children: [new TextRun({ text: resume.headline.trim(), size: st.headline.size * 2 })],
    }))
  }
  const contact = contactLines(resume)
  if (contact.length) {
    top.push(new Paragraph({
      alignment: align,
      spacing: place(st.contact.step, st.contact.after),
      children: contact.map((line, i) => new TextRun({ text: line, break: i ? 1 : undefined, size: st.contact.size * 2 })),
    }))
  }

  const body: Paragraph[] = []

  // Name and link or dates, then the subtitle in italics under it, as in the PDF (#190).
  const entryHeader = (name: string, subtitle: string | undefined, right: string | undefined, keepNext: boolean) => {
    const beside = !right || fitsBeside(resume, right)
    return [
      twoCol(name, beside ? right ?? '' : '', 'bold', st.entryStep, keepNext || !!subtitle || !beside),
      ...(subtitle ? [twoCol(subtitle, '', 'italic', st.entryStep, keepNext || !beside)] : []),
      ...(beside ? [] : [new Paragraph({ keepNext, keepLines: true, spacing: place(LH, LH + 1), children: [new TextRun(right!)] })]),
    ]
  }

  // Each section, in the order the user set (sections.ts) (#118).
  const add: Record<StandardSection, () => void> = {
    summary: () => {
      if (resume.summary) body.push(heading('SUMMARY'), new Paragraph({ spacing: place(LH, LH), children: [new TextRun(resume.summary)] }))
    },
    experience: () => {
      if (!resume.experience?.length) return
      body.push(heading('EXPERIENCE'))
      for (const exp of resume.experience) {
        body.push(
          twoCol(exp.title, exp.dates, 'bold', st.entryStep, true),
          twoCol(exp.company, exp.location, 'italic', st.entryStep + 2, !!exp.bullets?.length),
          ...(exp.bullets ?? []).map(bullet),
        )
        entryGap()
      }
    },
    projects: () => {
      if (!resume.projects?.length) return
      body.push(heading('PROJECTS'))
      for (const proj of resume.projects) {
        body.push(...entryHeader(proj.name || '', proj.tech, proj.link, !!proj.bullets?.length), ...(proj.bullets ?? []).map(bullet))
        entryGap()
      }
    },
    education: () => {
      if (!resume.education?.length) return
      body.push(heading('EDUCATION'))
      for (const edu of resume.education) {
        const gpa = (edu.bullets ?? []).filter((b) => GPA_LINE.test(b.trim()))
        const rest = (edu.bullets ?? []).filter((b) => !GPA_LINE.test(b.trim()))
        body.push(
          twoCol(edu.institution, edu.dates, 'bold', st.entryStep, true),
          twoCol([edu.degree, ...gpa.map((g) => g.trim())].filter(Boolean).join('  |  '), edu.location, 'italic', st.entryStep + 2, !!rest.length),
          ...rest.map(bullet),
        )
        entryGap()
      }
    },
    certifications: () => {
      if (resume.certifications?.length) body.push(heading('CERTIFICATIONS'), ...resume.certifications.map(bullet))
    },
    skills: () => {
      if (!resume.skills) return
      body.push(heading('SKILLS'))
      // keepNext: the section moves to the next page whole, as in the PDF (#119).
      const groups = resume.skills.split(/\n+/).map((l) => l.trim()).filter(Boolean)
      groups.forEach((group, i) => {
        const m = SKILL_GROUP.exec(group)
        body.push(new Paragraph({
          keepLines: true,
          keepNext: i < groups.length - 1,
          spacing: place(LH, LH + 1),
          children: m ? [new TextRun({ text: `${m[1].trim()}: `, bold: true }), new TextRun(m[2])] : [new TextRun(group)],
        }))
      })
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
      for (const e of entries) {
        body.push(
          ...entryHeader(e.name, e.subtitle, e.dates || e.link, !!e.bullets?.length || !!(e.dates && e.link)),
          ...(e.dates && e.link ? [new Paragraph({ keepNext: !!e.bullets?.length, spacing: place(LH, LH + 1), children: [new TextRun({ text: e.link, italics: true })] })] : []),
          ...(e.bullets ?? []).map(bullet),
        )
        entryGap()
      }
      body.push(...lines.map(bullet))
    }
  }

  const page = (marginTop: number) => ({
    size: { width: 612 * PT, height: 792 * PT },
    margin: { top: Math.round(marginTop * PT), bottom: Math.round((st.bottom + 2 + EXACT_UP * LH) * PT), left: st.margin * PT, right: st.margin * PT },
  })

  const doc = new Document({
    creator: resume.name || undefined,
    title: resume.name ? `${resume.name} – Resume` : 'Resume',
    styles: {
      default: {
        document: {
          run: { font, size: st.body * 2 },
          paragraph: { spacing: { before: 0, after: 0, line: LH * PT, lineRule: LineRuleType.EXACT } },
        },
        title: {
          run: { font, size: name * 2, bold: st.name.bold, color: '000000' },
          paragraph: { alignment: align, spacing: { before: 0, after: 0, line: 240, lineRule: LineRuleType.AUTO } },
        },
        heading1: {
          run: { font, size: st.heading.size * 2, bold: true, color: hex(st.heading.colour) },
          paragraph: {
            // Border widths are in eighths of a point, 2 at the thinnest (http://officeopenxml.com/WPborders.php).
            border: { bottom: { style: BorderStyle.SINGLE, size: ruleWidth, color: hex(st.heading.rule.colour), space: 1 } },
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
    // The PDF's top margin is the baseline of a page's first line: the name on page one, a body
    // line after. A continuous section break gives later pages their own top margin, since Word
    // takes a page's margins from the section it starts in. The PDF starts a page when a line plus
    // about one more (14pt) would pass its bottom margin; Word only needs the line's box to fit (#119).
    sections: [
      { children: top, properties: { page: page(st.top - SINGLE_UP * name) } },
      { children: body, properties: { type: SectionType.CONTINUOUS, page: page(st.top - EXACT_UP * LH) } },
    ],
  })
  return Packer.toBlob(doc)
}

export async function downloadTailoredResumeDocx(resume: TailoredResume, jobTitle?: string): Promise<void> {
  saveFile(await buildResumeDocx(resume), resumeFileName(resume, jobTitle, 'docx'))
}
