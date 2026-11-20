// Shared with the website. Edit here, then run `node scripts/sync-pdf.mjs`,
// which copies this folder to web/lib/pdf/ (both builds fail on a stale copy).
import { jsPDF } from 'jspdf'
import { contactParts } from './contact'
import { resumeFileName } from './file-name'
import { orderedSections, type StandardSection } from './sections'
import type { ResumeSection, TailoredResume } from './types'

// Letter page: 612 × 792 pt
const PW = 612
const PH = 792

// Layout scales tried, largest first, when the resume runs onto a page it
// barely needs: a little tighter type, spacing and margins usually pull it
// back. 0.88 is the floor: 8.8pt body text and 47pt side margins.
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

function drawResume(resume: TailoredResume, k: number): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const ML = Math.round(54 - (1 - k) * 60)   // left margin: 54pt at full size
  const MR = PW - ML
  const CW = MR - ML
  const TOP = 50 * k
  const BOTTOM = PH - 44 * k
  const LH = 12 * k      // body line height
  const BODY = 10 * k    // body font size
  let y = TOP

  // ── Page overflow guard ──────────────────────────────────────────────────
  function need(pts: number) {
    if (y + pts > BOTTOM) {
      doc.addPage()
      y = TOP
    }
  }

  // ── Header ───────────────────────────────────────────────────────────────
  doc.setFont('times', 'bold')
  doc.setFontSize(24 * k)
  doc.text(resume.name || 'Resume', PW / 2, y, { align: 'center' })
  y += 15 * k

  // Wrapped between items, never inside a URL, once links and a location
  // make the line wider than the page. One URL wider than the page still
  // overflows; no real one is.
  const contact: string[] = []
  doc.setFont('times', 'normal')
  doc.setFontSize(9.5 * k)
  for (const part of contactParts(resume)) {
    const joined = `${contact[contact.length - 1]}  |  ${part}`
    if (contact.length && doc.getTextWidth(joined) <= CW) contact[contact.length - 1] = joined
    else contact.push(part)
  }
  contact.forEach((line, i) => {
    if (i) y += 11 * k
    doc.text(line, PW / 2, y, { align: 'center' })
  })
  if (contact.length) y += 7 * k

  // ── Section heading + rule ───────────────────────────────────────────────
  // Kept with the first lines under it, so a heading never ends a page.
  function sectionHeading(title: string) {
    y += 9 * k
    need(18 * k + LH * 3)
    doc.setFont('times', 'bold')
    doc.setFontSize(11 * k)
    doc.text(title, ML, y)
    y += 3 * k
    doc.setDrawColor(0)
    doc.setLineWidth(0.5)
    doc.line(ML, y, MR, y)
    y += 9.5 * k
  }

  // ── Two-column line (left text, right text) ──────────────────────────────
  function twoCol(
    left: string,
    right: string,
    leftStyle: 'bold' | 'italic',
    size = 10.5 * k,
  ) {
    need(14 * k)
    doc.setFont('times', leftStyle)
    doc.setFontSize(size)
    doc.text(left || '', ML, y)
    doc.setFont('times', 'normal')
    doc.text(right || '', MR, y, { align: 'right' })
    y += 13 * k
  }

  // ── Bullet line with hanging indent ─────────────────────────────────────
  const BULLET_X = ML + 4 * k   // bullet char position
  const TEXT_X  = ML + 14 * k   // text start (hanging indent)
  const WRAP_W  = MR - TEXT_X

  function bulletLines(text: string): string[] {
    doc.setFont('times', 'normal')
    doc.setFontSize(BODY)
    return doc.splitTextToSize(String(text ?? ''), WRAP_W) as string[]
  }

  function bullet(text: string) {
    const lines = bulletLines(text)
    need(lines.length * LH + 2)
    doc.text('•', BULLET_X, y)
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

  function paragraph(text: string) {
    doc.setFont('times', 'normal')
    doc.setFontSize(BODY)
    for (const line of doc.splitTextToSize(text, CW) as string[]) {
      need(LH)
      doc.text(line, ML, y)
      y += LH
    }
  }

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
          y += 4 * k
        }
      }
    },
    projects: () => {
      if (resume.projects?.length) {
        sectionHeading('PROJECTS')
        for (const proj of resume.projects) {
          needEntry(1, proj.bullets)
          doc.setFont('times', 'bold')
          doc.setFontSize(10.5 * k)
          doc.text(proj.name || '', ML, y)
          y += 13 * k
          for (const b of proj.bullets ?? []) bullet(b)
          y += 4 * k
        }
      }
    },
    education: () => {
      if (resume.education?.length) {
        sectionHeading('EDUCATION')
        for (const edu of resume.education) {
          needEntry(2, edu.bullets)
          twoCol(edu.institution, edu.dates, 'bold')
          twoCol(edu.degree, edu.location, 'italic')
          y += 1 * k
          for (const b of edu.bullets ?? []) bullet(b)
          y += 4 * k
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
        paragraph(resume.skills)
      }
    },
  }

  // ── Other sections (publications, volunteer work…), as the resume had them ─
  const drawOther = (section: ResumeSection) => {
    if (!section.lines?.length) return
    sectionHeading(String(section.heading ?? '').toUpperCase())
    for (const line of section.lines) bullet(line)
  }

  for (const s of orderedSections(resume)) {
    if (s.key === 'other') drawOther(resume.otherSections![s.index])
    else draw[s.key]()
  }

  return doc
}
