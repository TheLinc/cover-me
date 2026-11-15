// Shared with the website. Edit here, then run `node scripts/sync-pdf.mjs`,
// which copies this folder to web/lib/pdf/ (both builds fail on a stale copy).
import { jsPDF } from 'jspdf'
import { contactParts } from './contact'
import { resumeFileName } from './file-name'
import { GPA_LINE, SKILL_GROUP } from './layout-rules'
import { orderedSections, type StandardSection } from './sections'
import type { ResumeSection, TailoredResume } from './types'

// Letter page: 612 × 792 pt
const PW = 612
const PH = 792
const ML = 54   // left margin
const MR = 558  // right margin
const CW = MR - ML  // content width: 504pt

export function downloadTailoredResumePdf(resume: TailoredResume, jobTitle?: string): void {
  tailoredResumePdf(resume).save(resumeFileName(resume, jobTitle, 'pdf'))
}

// Letters the standard fonts lack and that don't decompose into a base letter
// and an accent: printed as the plain letter rather than dropped.
const PLAIN: Record<string, string> = {
  '\u0141': 'L', '\u0142': 'l', '\u0110': 'D', '\u0111': 'd', '\u0126': 'H', '\u0127': 'h',
  '\u0131': 'i', '\u0166': 'T', '\u0167': 't', '\u0138': 'k',
}

// What the standard PDF fonts print: ASCII, Latin-1 and the WinAnsi extras in
// 0x80-0x9F (Š š Ž ž Œ œ Ÿ, curly quotes, dashes, the bullet, the euro sign).
const WIN_ANSI = /[\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178]/

// The standard PDF fonts only cover WinAnsi: anything outside it (a non-breaking
// hyphen, an arrow, a zero-width space from a PDF upload) prints as garbage or
// spreads letters apart, so it is swapped for its plain equivalent first. A
// letter outside it loses its accent ("ń" prints as "n"), never the letter.
export function pdfSafe(text: unknown): string {
  return Array.from(String(text ?? '')
    .replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, '')
    .replace(/[\u2010-\u2012\u2212]/g, '-')
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F]/g, ' ')
    .replace(/\u2192/g, '->')
    .replace(/\u2264/g, '<=')
    .replace(/\u2265/g, '>='))
    .map((ch) => {
      if (WIN_ANSI.test(ch)) return ch
      const base = ch.normalize('NFD').replace(/[\u0300-\u036F]/g, '')
      if (base && Array.from(base).every((c) => WIN_ANSI.test(c))) return base
      return PLAIN[ch] ?? ''
    })
    .join('')
}

// The resume as a jsPDF document: saved by the download, shown as a blob URL
// by the extension's editor preview, so the two are the same file.
export function tailoredResumePdf(resume: TailoredResume): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const LH = 12        // body line height
  const BODY = 10      // body font size
  const ENTRY = 10.5   // entry header font size
  let y = 52

  // ── Page overflow guard ──────────────────────────────────────────────────
  function need(pts: number) {
    if (y + pts > PH - 48) {
      doc.addPage()
      y = 52
    }
  }

  const text = (s: string, x: number, opts?: { align?: 'center' | 'right' }) => doc.text(pdfSafe(s), x, y, opts)
  const width = (s: string) => doc.getTextWidth(pdfSafe(s))
  const wrap = (s: string, w: number) => doc.splitTextToSize(pdfSafe(s), w) as string[]

  // ── Header ───────────────────────────────────────────────────────────────
  doc.setFont('times', 'bold')
  doc.setFontSize(26)
  text(resume.name || 'Resume', PW / 2, { align: 'center' })
  y += 16

  if (resume.headline?.trim()) {
    doc.setFont('times', 'normal')
    doc.setFontSize(11.5)
    text(resume.headline.trim(), PW / 2, { align: 'center' })
    y += 13
  }

  // Wrapped between items, never inside a URL, once links and a location
  // make the line wider than the page. One URL wider than the page still
  // overflows; no real one is.
  const contact: string[] = []
  doc.setFont('times', 'normal')
  doc.setFontSize(10)
  for (const part of contactParts(resume)) {
    const joined = `${contact[contact.length - 1]}   |   ${part}`
    if (contact.length && width(joined) <= CW) contact[contact.length - 1] = joined
    else contact.push(part)
  }
  contact.forEach((line, i) => {
    if (i) y += 12
    text(line, PW / 2, { align: 'center' })
  })
  if (contact.length) y += 6

  // ── Section heading + rule ───────────────────────────────────────────────
  function sectionHeading(title: string) {
    y += 10
    need(18)
    doc.setFont('times', 'bold')
    doc.setFontSize(11)
    text(title, ML)
    y += 3
    doc.setDrawColor(0)
    doc.setLineWidth(0.5)
    doc.line(ML, y, MR, y)
    y += 9
  }

  // ── Two-column line (left text, right text) ──────────────────────────────
  // A left side too wide for the line wraps under itself.
  function twoCol(left: string, right: string, leftStyle: 'bold' | 'italic', size = ENTRY) {
    need(14)
    doc.setFont('times', 'normal')
    doc.setFontSize(size)
    const rightW = right ? width(right) + 10 : 0
    doc.setFont('times', leftStyle)
    const lines = wrap(left || '', CW - rightW)
    lines.forEach((line, i) => {
      if (i) y += LH
      text(line, ML)
    })
    if (right) {
      doc.setFont('times', 'normal')
      doc.text(pdfSafe(right), MR, y - (lines.length - 1) * LH, { align: 'right' })
    }
    y += 13
  }

  // "Name | subtitle": bold then italic on one line, a right-hand note at the
  // margin. The italic part moves to its own line when both don't fit.
  function entryHeader(name: string, subtitle: string | undefined, right: string | undefined) {
    need(14)
    doc.setFontSize(ENTRY)
    doc.setFont('times', 'normal')
    const rightW = right ? width(right) + 10 : 0
    doc.setFont('times', 'bold')
    const nameW = width(name)
    text(name, ML)
    let wrapped = false
    if (subtitle) {
      doc.setFont('times', 'italic')
      const sub = `  |  ${subtitle}`
      if (nameW + width(sub) <= CW - rightW) text(sub, ML + nameW)
      else wrapped = true
    }
    if (right) {
      doc.setFont('times', 'normal')
      text(right, MR, { align: 'right' })
    }
    y += 13
    if (wrapped && subtitle) {
      doc.setFont('times', 'italic')
      doc.setFontSize(BODY)
      for (const line of wrap(subtitle, CW)) {
        text(line, ML)
        y += LH
      }
      y += 1
    }
  }

  // ── Bullet line with hanging indent ─────────────────────────────────────
  const BULLET_X = ML + 4   // bullet char position
  const TEXT_X = ML + 14   // text start (hanging indent)
  const WRAP_W = MR - TEXT_X

  function bulletLines(s: string): string[] {
    doc.setFont('times', 'normal')
    doc.setFontSize(BODY)
    return wrap(s, WRAP_W)
  }

  function bullet(s: string) {
    const lines = bulletLines(s)
    need(lines.length * LH + 2)
    doc.setFont('times', 'normal')
    doc.setFontSize(BODY)
    text('•', BULLET_X)
    for (const line of lines) {
      doc.text(line, TEXT_X, y)
      y += LH
    }
    y += 1
  }

  function paragraph(s: string) {
    doc.setFont('times', 'normal')
    doc.setFontSize(BODY)
    for (const line of wrap(s, CW)) {
      need(LH)
      doc.text(line, ML, y)
      y += LH
    }
  }

  // Skills: one line per labelled group ("Languages: Python, SQL") with the
  // label in bold, or a plain comma list.
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
      doc.setFont('times', 'bold')
      // jsPDF drops a trailing space from the measured width, so the gap is added by hand.
      const labelW = width(label) + BODY * 0.5
      doc.setFont('times', 'normal')
      const firstLine = wrap(m[2], CW - labelW)[0] ?? ''
      const rest = pdfSafe(m[2]).slice(firstLine.length).trim()
      const restLines = rest ? wrap(rest, CW) : []
      need(LH * (1 + restLines.length))
      doc.setFont('times', 'bold')
      text(label, ML)
      doc.setFont('times', 'normal')
      doc.text(firstLine, ML + labelW, y)
      y += LH
      for (const line of restLines) {
        doc.text(line, ML, y)
        y += LH
      }
      y += 1
    }
  }

  const entryGap = () => { y += 5 }

  // Each section, drawn in the order the user set (sections.ts).
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

  // ── Other sections (open source, awards, publications…), as the resume had them ─
  // Its entries, each printed like a project, then any lines outside an entry.
  const drawOther = (section: ResumeSection) => {
    const entries = section.entries?.filter((e) => e?.name) ?? []
    const lines = section.lines ?? []
    if (!entries.length && !lines.length) return
    sectionHeading(String(section.heading ?? '').toUpperCase())
    for (const e of entries) {
      entryHeader(e.name, e.subtitle, e.dates || e.link)
      if (e.dates && e.link) {
        doc.setFont('times', 'italic')
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
