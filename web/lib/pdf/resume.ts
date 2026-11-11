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

// Layout scales tried, largest first, when the resume runs onto a page it
// barely needs: a little tighter type and spacing usually pulls it back.
const FIT_SCALES = [0.97, 0.94, 0.91, 0.88]

export function downloadTailoredResumePdf(resume: TailoredResume, jobTitle?: string): void {
  tailoredResumePdf(resume).save(resumeFileName(resume, jobTitle, 'pdf'))
}

// The resume as a jsPDF document: saved by the download, shown as a blob URL
// by the extension's editor preview, so the two are the same file. Drawn at
// full size first; when that spills onto another page, the first slightly
// smaller scale that saves the page wins.
export function tailoredResumePdf(resume: TailoredResume): jsPDF {
  const full = drawResume(resume, 1)
  const pages = full.getNumberOfPages()
  if (pages > 1) {
    for (const scale of FIT_SCALES) {
      const doc = drawResume(resume, scale)
      if (doc.getNumberOfPages() < pages) return doc
    }
  }
  return full
}

// The standard PDF fonts only cover WinAnsi: anything outside it (a non-breaking
// hyphen, an arrow, a zero-width space from a PDF upload) prints as garbage or
// spreads letters apart, so it is swapped for its plain equivalent first.
export function pdfSafe(text: unknown): string {
  return String(text ?? '')
    .replace(/[​-‍⁠﻿­]/g, '')
    .replace(/[‐‑‒−]/g, '-')
    .replace(/[  -   ]/g, ' ')
    .replace(/→/g, '->')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—‘’“”•…€™]/g, '')
}

function drawResume(resume: TailoredResume, k: number): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const ML = Math.round(54 - (1 - k) * 60)
  const MR = PW - ML
  const CW = MR - ML
  const TOP = 50 * k
  const BOTTOM = PH - 44 * k
  const LH = 12 * k          // body line height
  const BODY = 10 * k        // body font size
  const ENTRY = 10.5 * k     // entry header font size
  let y = TOP

  // ── Page overflow guard ──────────────────────────────────────────────────
  function need(pts: number) {
    if (y + pts > BOTTOM) {
      doc.addPage()
      y = TOP
    }
  }

  const text = (s: string, x: number, opts?: { align?: 'center' | 'right' }) => doc.text(pdfSafe(s), x, y, opts)
  const width = (s: string) => doc.getTextWidth(pdfSafe(s))
  const wrap = (s: string, w: number) => doc.splitTextToSize(pdfSafe(s), w) as string[]

  // ── Header ───────────────────────────────────────────────────────────────
  doc.setFont('times', 'bold')
  doc.setFontSize(24 * k)
  text(resume.name || 'Resume', PW / 2, { align: 'center' })
  y += 15 * k

  if (resume.headline?.trim()) {
    doc.setFont('times', 'normal')
    doc.setFontSize(11.5 * k)
    text(resume.headline.trim(), PW / 2, { align: 'center' })
    y += 13 * k
  }

  // Wrapped between items, never inside a URL, once links and a location
  // make the line wider than the page.
  const contact: string[] = []
  doc.setFont('times', 'normal')
  doc.setFontSize(9.5 * k)
  for (const part of contactParts(resume)) {
    const joined = `${contact[contact.length - 1]}  |  ${part}`
    if (contact.length && width(joined) <= CW) contact[contact.length - 1] = joined
    else contact.push(part)
  }
  contact.forEach((line, i) => {
    if (i) y += 11 * k
    text(line, PW / 2, { align: 'center' })
  })
  if (contact.length) y += 7 * k

  // ── Section heading + rule ───────────────────────────────────────────────
  // Kept with the first lines under it, so a heading never ends a page.
  function sectionHeading(title: string) {
    y += 9 * k
    need(18 * k + LH * 3)
    doc.setFont('times', 'bold')
    doc.setFontSize(11 * k)
    text(title, ML)
    y += 3 * k
    doc.setDrawColor(0)
    doc.setLineWidth(0.5)
    doc.line(ML, y, MR, y)
    y += 9.5 * k
  }

  // ── Two-column line (left text, right text) ──────────────────────────────
  function twoCol(left: string, right: string, leftStyle: 'bold' | 'italic', size = ENTRY) {
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
    y += 13 * k
  }

  // "Name | subtitle": bold then italic on one line, a right-hand note at the
  // margin. The italic part moves to its own line when both don't fit.
  function entryHeader(name: string, subtitle: string | undefined, right: string | undefined) {
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
    y += 13 * k
    if (wrapped && subtitle) {
      doc.setFont('times', 'italic')
      doc.setFontSize(BODY)
      for (const line of wrap(subtitle, CW)) {
        text(line, ML)
        y += LH
      }
      y += 1 * k
    }
  }

  // ── Bullet line with hanging indent ─────────────────────────────────────
  const BULLET_X = ML + 4 * k
  const TEXT_X = ML + 14 * k
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
    y += 1.5 * k
  }

  // Room for an entry's header lines plus its first bullet, so a title never
  // sits alone at the bottom of a page.
  function needEntry(headerLines: number, bullets: string[] | undefined) {
    const first = bullets?.length ? bulletLines(bullets[0]).length * LH : 0
    need(headerLines * 13 * k + first + 2)
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
      y += 1 * k
    }
  }

  const entryGap = () => { y += 4 * k }

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
          needEntry(2, exp.bullets)
          twoCol(exp.title, exp.dates, 'bold')
          twoCol(exp.company, exp.location, 'italic')
          y += 1 * k
          for (const b of exp.bullets ?? []) bullet(b)
          entryGap()
        }
      }
    },
    projects: () => {
      if (resume.projects?.length) {
        sectionHeading('PROJECTS')
        for (const proj of resume.projects) {
          needEntry(1, proj.bullets)
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
          needEntry(2, rest)
          twoCol(edu.institution, edu.dates, 'bold')
          twoCol(degree, edu.location, 'italic')
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
  const drawOther = (section: ResumeSection) => {
    const entries = section.entries?.filter((e) => e?.name) ?? []
    if (!entries.length && !section.lines?.length) return
    sectionHeading(String(section.heading ?? '').toUpperCase())
    if (entries.length) {
      for (const e of entries) {
        const right = e.dates || e.link
        needEntry(e.dates && e.link ? 2 : 1, e.bullets)
        entryHeader(e.name, e.subtitle, right)
        if (e.dates && e.link) {
          doc.setFont('times', 'italic')
          doc.setFontSize(BODY)
          text(e.link, ML)
          y += LH + 1 * k
        }
        for (const b of e.bullets ?? []) bullet(b)
        entryGap()
      }
      return
    }
    for (const line of section.lines) bullet(line)
  }

  for (const s of orderedSections(resume)) {
    if (s.key === 'other') drawOther(resume.otherSections![s.index])
    else draw[s.key]()
  }

  return doc
}
