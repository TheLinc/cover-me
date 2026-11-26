// Shared with the website. Edit here, then run `node scripts/sync-pdf.mjs`,
// which copies this folder to web/lib/pdf/ (both builds fail on a stale copy) (#27).
import { jsPDF } from 'jspdf'
import { contactParts } from './contact'
import { resumeFileName } from './file-name'
import { GPA_LINE, SKILL_GROUP } from './layout-rules'
import { orderedSections, type StandardSection } from './sections'
import type { ResumeSection, ResumeTemplate, TailoredResume } from './types'

// Letter page: 612 × 792 pt (https://github.com/TheLinc/cover-me/commit/a074665df759617a5ebedfaf28370e973177338c)
const PW = 612
const PH = 792

type RGB = [number, number, number]

// One layout, several looks: every template is single-column with plain-text
// contact details, so ATS parsing holds (#119). Sizes and gaps are in points.
interface TemplateStyle {
  font: 'times' | 'helvetica'
  margin: number
  top: number
  bottom: number
  align: 'center' | 'left'
  name: { size: number; bold: boolean; after: number }
  headline: { size: number; after: number }
  contact: { size: number; step: number; after: number; sep: string }
  heading: { size: number; before: number; after: number; colour: RGB; rule: { width: number; colour: RGB } }
  body: number
  entry: number
  lineHeight: number
  entryStep: number
  entryGap: number
  accented?: boolean
}

const BLACK: RGB = [0, 0, 0]
const INDIGO: RGB = [79, 70, 229]
export const DEFAULT_ACCENT = '#4F46E5'

export const RESUME_TEMPLATES: ResumeTemplate[] = ['classic', 'modern', 'compact', 'minimal']

const CLASSIC: TemplateStyle = {
  font: 'times', margin: 54, top: 52, bottom: 48, align: 'center',
  name: { size: 26, bold: true, after: 16 },
  headline: { size: 11.5, after: 13 },
  contact: { size: 10, step: 12, after: 6, sep: '   |   ' },
  heading: { size: 11, before: 10, after: 9, colour: BLACK, rule: { width: 0.5, colour: BLACK } },
  body: 10, entry: 10.5, lineHeight: 12, entryStep: 13, entryGap: 5,
}

const STYLES: Record<ResumeTemplate, TemplateStyle> = {
  classic: CLASSIC,
  modern: {
    ...CLASSIC, font: 'helvetica', align: 'left',
    name: { size: 24, bold: true, after: 15 },
    headline: { size: 11, after: 13 },
    contact: { size: 9, step: 11.5, after: 6, sep: '   |   ' },
    heading: { size: 10.5, before: 11, after: 9, colour: INDIGO, rule: { width: 0.75, colour: INDIGO } },
    body: 9.5, entry: 10, lineHeight: 12, accented: true,
  },
  compact: {
    ...CLASSIC, margin: 40, top: 46, bottom: 36,
    name: { size: 20, bold: true, after: 13 },
    headline: { size: 10.5, after: 12 },
    contact: { size: 9, step: 11, after: 4, sep: '  |  ' },
    heading: { size: 10, before: 7, after: 7.5, colour: BLACK, rule: { width: 0.4, colour: BLACK } },
    body: 9.5, entry: 10, lineHeight: 11, entryStep: 12, entryGap: 3,
  },
  minimal: {
    ...CLASSIC, font: 'helvetica', margin: 64, top: 74, bottom: 56, align: 'left',
    name: { size: 34, bold: false, after: 20 },
    headline: { size: 11, after: 14 },
    contact: { size: 9, step: 12, after: 10, sep: '   ·   ' },
    heading: { size: 9, before: 16, after: 11, colour: [90, 90, 90], rule: { width: 0.3, colour: [200, 200, 200] } },
    body: 9.5, entry: 10, lineHeight: 13.5, entryStep: 14.5, entryGap: 8,
  },
}

// Stored resumes are untrusted JSON: an unknown name, even one on Object's prototype, prints as Classic (#119).
export function templateOf(template: unknown): ResumeTemplate {
  return RESUME_TEMPLATES.find((name) => name === template) ?? 'classic'
}

export const hasAccent = (template: ResumeTemplate) => !!STYLES[template].accented

// Stored resumes are untrusted JSON: anything but a "#RRGGBB" colour prints in the template's own (#119).
export function accentOf(accent: unknown): string | undefined {
  return typeof accent === 'string' && /^#[0-9a-f]{6}$/i.test(accent) ? accent : undefined
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB

export function downloadTailoredResumePdf(resume: TailoredResume, jobTitle?: string): void {
  tailoredResumePdf(resume).save(resumeFileName(resume, jobTitle, 'pdf'))
}

// Letters and units the standard fonts lack and that don't decompose into a
// base letter and an accent: printed as the nearest plain form rather than
// dropped, so "50 \u03bcg" never prints as "50 g" (#190).
const PLAIN: Record<string, string> = {
  '\u0141': 'L', '\u0142': 'l', '\u0110': 'D', '\u0111': 'd', '\u0126': 'H', '\u0127': 'h',
  '\u0131': 'i', '\u0166': 'T', '\u0167': 't', '\u0138': 'k',
  '\u03bc': '\u00b5', '\u03a9': ' ohm', '\u2126': ' ohm',
  '\u2260': '!=', '\u2248': '~', '\u2032': "'", '\u2033': '"', '\u20b9': 'Rs ',
}

// Accent marks a letter can lose and still read the same. U+0338 (the stroke
// that makes "=" into "\u2260") is not one of them (#190).
const ACCENTS = /[\u0300-\u0337\u0339-\u036f]/g

// What the standard PDF fonts print: ASCII, Latin-1 and the WinAnsi extras in
// 0x80-0x9F (Š š Ž ž Œ œ Ÿ, curly quotes, dashes, the bullet, the euro sign) (#190).
const WIN_ANSI = /[\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178]/

// The standard PDF fonts only cover WinAnsi: anything outside it (a non-breaking
// hyphen, an arrow, a zero-width space from a PDF upload) prints as garbage or
// spreads letters apart, so it is swapped for its plain equivalent first. A
// letter outside it loses its accent ("ń" prints as "n"), never the letter (#190).
export function pdfSafe(text: unknown): string {
  return Array.from(String(text ?? '')
    .replace(/[\u200B-\u200D\u2060\uFEFF\u00AD\uFE00-\uFE0F]/g, '')
    .replace(/[\u2010-\u2012\u2212]/g, '-')
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F]/g, ' ')
    .replace(/\u2192/g, '->')
    .replace(/\u2264/g, '<=')
    .replace(/\u2265/g, '>='))
    .map((ch) => {
      if (WIN_ANSI.test(ch)) return ch
      if (PLAIN[ch]) return PLAIN[ch]
      // A superscript keeps a caret, so "10\u2076" never reads as "106"; other
      // compatibility forms print plain, so "CO\u2082" prints as "CO2" (#190).
      if (/[\u2070-\u207f]/.test(ch)) return `^${ch.normalize('NFKD')}`
      const base = ch.normalize('NFKD').replace(ACCENTS, '')
      if (base && Array.from(base).every((c) => WIN_ANSI.test(c))) return base
      // Anything else shows as "?", so a reader sees something is missing;
      // only an emoji is dropped (#190).
      return /\p{Extended_Pictographic}/u.test(ch) ? '' : '?'
    })
    .join('')
}

// The resume as a jsPDF document: saved by the download, shown as a blob URL
// by the extension's editor preview, so the two are the same file (#118).
export function tailoredResumePdf(resume: TailoredResume): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const st = STYLES[templateOf(resume.template)]
  const { font } = st
  const accent = st.accented ? accentOf(resume.accent) : undefined
  const heading = accent ? { ...st.heading, colour: rgb(accent), rule: { ...st.heading.rule, colour: rgb(accent) } } : st.heading
  const ML = st.margin
  const MR = PW - st.margin
  const CW = MR - ML
  const LH = st.lineHeight
  const BODY = st.body
  const ENTRY = st.entry
  let y = st.top

  function need(pts: number) {
    if (y + pts > PH - st.bottom) {
      doc.addPage()
      y = st.top
    }
  }

  const text = (s: string, x: number, opts?: { align?: 'center' | 'right' }) => doc.text(pdfSafe(s), x, y, opts)
  const width = (s: string) => doc.getTextWidth(pdfSafe(s))
  const wrap = (s: string, w: number) => doc.splitTextToSize(pdfSafe(s), w) as string[]
  const header = (s: string) => (st.align === 'center' ? text(s, PW / 2, { align: 'center' }) : text(s, ML))

  doc.setFont(font, st.name.bold ? 'bold' : 'normal')
  doc.setFontSize(st.name.size)
  header(resume.name || 'Resume')
  y += st.name.after

  if (resume.headline?.trim()) {
    doc.setFont(font, 'normal')
    doc.setFontSize(st.headline.size)
    header(resume.headline.trim())
    y += st.headline.after
  }

  // Wrapped between items, never inside a URL, once links and a location
  // make the line wider than the page. One URL wider than the page still
  // overflows; no real one is (#149).
  const contact: string[] = []
  doc.setFont(font, 'normal')
  doc.setFontSize(st.contact.size)
  for (const part of contactParts(resume)) {
    const joined = `${contact[contact.length - 1]}${st.contact.sep}${part}`
    if (contact.length && width(joined) <= CW) contact[contact.length - 1] = joined
    else contact.push(part)
  }
  contact.forEach((line, i) => {
    if (i) y += st.contact.step
    header(line)
  })
  if (contact.length) y += st.contact.after

  function sectionHeading(title: string) {
    y += heading.before
    need(18)
    doc.setFont(font, 'bold')
    doc.setFontSize(heading.size)
    const tinted = heading.colour !== BLACK
    if (tinted) doc.setTextColor(...heading.colour)
    text(title, ML)
    if (tinted) doc.setTextColor(0)
    y += 3
    doc.setDrawColor(...heading.rule.colour)
    doc.setLineWidth(heading.rule.width)
    doc.line(ML, y, MR, y)
    y += heading.after
  }

  // A left side too wide for the line wraps under itself (#190).
  function twoCol(left: string, right: string, leftStyle: 'bold' | 'italic', size = ENTRY) {
    doc.setFont(font, 'normal')
    doc.setFontSize(size)
    const rightW = right ? Math.min(width(right) + 10, CW / 2) : 0
    doc.setFont(font, leftStyle)
    const lines = wrap(left || '', CW - rightW)
    need(14 + LH * (lines.length - 1))
    lines.forEach((line, i) => {
      if (i) y += LH
      text(line, ML)
    })
    if (right) {
      doc.setFont(font, 'normal')
      doc.text(pdfSafe(right), MR, y - (lines.length - 1) * LH, { align: 'right' })
    }
    y += st.entryStep
  }

  // Name and a right-hand note (a link, dates) on one line, then the subtitle (a
  // project's stack, an award's issuer) in italics under it, like a job's company
  // line. A note wider than half the line (a long link) goes on its own line (#190).
  function entryHeader(name: string, subtitle: string | undefined, right: string | undefined) {
    doc.setFontSize(ENTRY)
    doc.setFont(font, 'normal')
    const inline = !!right && width(right) <= CW / 2
    twoCol(name, inline ? right! : '', 'bold')
    if (subtitle) twoCol(subtitle, '', 'italic')
    if (right && !inline) {
      doc.setFont(font, 'normal')
      doc.setFontSize(BODY)
      for (const line of wrap(right, CW)) {
        need(LH)
        text(line, ML)
        y += LH
      }
      y += 1
    }
  }

  const BULLET_X = ML + 4
  const TEXT_X = ML + 14
  const WRAP_W = MR - TEXT_X

  function bulletLines(s: string): string[] {
    doc.setFont(font, 'normal')
    doc.setFontSize(BODY)
    return wrap(s, WRAP_W)
  }

  function bullet(s: string) {
    const lines = bulletLines(s)
    need(lines.length * LH + 2)
    doc.setFont(font, 'normal')
    doc.setFontSize(BODY)
    text('•', BULLET_X)
    for (const line of lines) {
      doc.text(line, TEXT_X, y)
      y += LH
    }
    y += 1
  }

  function paragraph(s: string) {
    doc.setFont(font, 'normal')
    doc.setFontSize(BODY)
    for (const line of wrap(s, CW)) {
      need(LH)
      doc.text(line, ML, y)
      y += LH
    }
  }

  // Skills: one line per labelled group ("Languages: Python, SQL") with the
  // label in bold, or a plain comma list (#190).
  function skills(s: string) {
    const groups = s.split(/\n+/).map((l) => l.trim()).filter(Boolean)
    for (const group of groups) {
      const m = SKILL_GROUP.exec(group)
      doc.setFontSize(BODY)
      if (!m) {
        paragraph(group)
        continue
      }
      const label = `${m[1].trim()}:`
      doc.setFont(font, 'bold')
      // jsPDF drops a trailing space from the measured width, so the gap is added by hand (#190).
      const labelW = width(label) + BODY * 0.5
      doc.setFont(font, 'normal')
      const firstLine = wrap(m[2], CW - labelW)[0] ?? ''
      const rest = pdfSafe(m[2]).slice(firstLine.length).trim()
      const restLines = rest ? wrap(rest, CW) : []
      need(LH * (1 + restLines.length))
      doc.setFont(font, 'bold')
      text(label, ML)
      doc.setFont(font, 'normal')
      doc.text(firstLine, ML + labelW, y)
      y += LH
      for (const line of restLines) {
        doc.text(line, ML, y)
        y += LH
      }
      y += 1
    }
  }

  const entryGap = () => { y += st.entryGap }

  // Each section, drawn in the order the user set (sections.ts) (#118).
  const draw: Record<StandardSection, () => void> = {
    summary: () => {
      if (resume.summary) {
        sectionHeading('SUMMARY')
        paragraph(resume.summary)
      }
    },
    experience: () => {
      if (resume.experience?.length) {
        sectionHeading('EXPERIENCE')
        for (const exp of resume.experience) {
          twoCol(exp.title, exp.dates, 'bold')
          twoCol(exp.company, exp.location, 'italic')
          y += 2
          for (const b of exp.bullets ?? []) bullet(b)
          entryGap()
        }
      }
    },
    projects: () => {
      if (resume.projects?.length) {
        sectionHeading('PROJECTS')
        for (const proj of resume.projects) {
          entryHeader(proj.name || '', proj.tech, proj.link)
          for (const b of proj.bullets ?? []) bullet(b)
          entryGap()
        }
      }
    },
    education: () => {
      if (resume.education?.length) {
        sectionHeading('EDUCATION')
        for (const edu of resume.education) {
          const bullets = edu.bullets ?? []
          const gpa = bullets.filter((b) => GPA_LINE.test(b.trim()))
          const rest = bullets.filter((b) => !GPA_LINE.test(b.trim()))
          const degree = [edu.degree, ...gpa.map((g) => g.trim())].filter(Boolean).join('  |  ')
          twoCol(edu.institution, edu.dates, 'bold')
          twoCol(degree, edu.location, 'italic')
          y += 2
          for (const b of rest) bullet(b)
          entryGap()
        }
      }
    },
    certifications: () => {
      if (resume.certifications?.length) {
        sectionHeading('CERTIFICATIONS')
        for (const cert of resume.certifications) bullet(cert)
      }
    },
    skills: () => {
      if (resume.skills) {
        sectionHeading('SKILLS')
        skills(resume.skills)
      }
    },
  }

  // Its entries, each printed like a project, then any lines outside an entry (#190).
  const drawOther = (section: ResumeSection) => {
    const entries = section.entries?.filter((e) => e?.name) ?? []
    const lines = section.lines ?? []
    if (!entries.length && !lines.length) return
    sectionHeading(String(section.heading ?? '').toUpperCase())
    for (const e of entries) {
      entryHeader(e.name, e.subtitle, e.dates || e.link)
      if (e.dates && e.link) {
        doc.setFont(font, 'italic')
        doc.setFontSize(BODY)
        text(e.link, ML)
        y += LH + 1
      }
      for (const b of e.bullets ?? []) bullet(b)
      entryGap()
    }
    for (const line of lines) bullet(line)
  }

  for (const s of orderedSections(resume)) {
    if (s.key === 'other') drawOther(resume.otherSections![s.index])
    else draw[s.key]()
  }

  return doc
}
