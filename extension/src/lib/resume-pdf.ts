import { jsPDF } from 'jspdf'
import type { TailoredResume } from '../types'

// Letter page: 612 × 792 pt
const PW = 612
const PH = 792
const ML = 54   // left margin
const MR = 558  // right margin
const CW = MR - ML  // content width: 504pt

export function downloadTailoredResumePdf(resume: TailoredResume, jobTitle?: string): void {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  let y = 52

  // ── Page overflow guard ──────────────────────────────────────────────────
  function need(pts: number) {
    if (y + pts > PH - 48) {
      doc.addPage()
      y = 52
    }
  }

  // ── Header ───────────────────────────────────────────────────────────────
  doc.setFont('times', 'bold')
  doc.setFontSize(26)
  doc.text(resume.name || 'Resume', PW / 2, y, { align: 'center' })
  y += 16

  const contactParts = [resume.phone, resume.email, resume.website].filter(Boolean)
  if (contactParts.length) {
    doc.setFont('times', 'normal')
    doc.setFontSize(10)
    doc.text(contactParts.join('   |   '), PW / 2, y, { align: 'center' })
    y += 6
  }

  // ── Section heading + rule ───────────────────────────────────────────────
  function sectionHeading(title: string) {
    y += 10
    need(18)
    doc.setFont('times', 'bold')
    doc.setFontSize(11)
    doc.text(title, ML, y)
    y += 3
    doc.setDrawColor(0)
    doc.setLineWidth(0.5)
    doc.line(ML, y, MR, y)
    y += 9
  }

  // ── Two-column line (left text, right text) ──────────────────────────────
  function twoCol(
    left: string,
    right: string,
    leftStyle: 'bold' | 'italic',
    size = 10.5,
  ) {
    need(14)
    doc.setFont('times', leftStyle)
    doc.setFontSize(size)
    doc.text(left, ML, y)
    doc.setFont('times', 'normal')
    doc.text(right, MR, y, { align: 'right' })
    y += 13
  }

  // ── Bullet line with hanging indent ─────────────────────────────────────
  const BULLET_X = ML + 4   // bullet char position
  const TEXT_X  = ML + 14   // text start (hanging indent)
  const WRAP_W  = MR - TEXT_X

  function bullet(text: string) {
    doc.setFont('times', 'normal')
    doc.setFontSize(10)
    const lines = doc.splitTextToSize(text, WRAP_W) as string[]
    need(lines.length * 12 + 2)
    doc.text('•', BULLET_X, y)
    for (const line of lines) {
      doc.text(line, TEXT_X, y)
      y += 12
    }
    y += 1
  }

  // ── SUMMARY ──────────────────────────────────────────────────────────────
  if (resume.summary) {
    sectionHeading('SUMMARY')
    doc.setFont('times', 'normal')
    doc.setFontSize(10)
    const lines = doc.splitTextToSize(resume.summary, CW) as string[]
    for (const line of lines) {
      need(12)
      doc.text(line, ML, y)
      y += 12
    }
  }

  // ── EXPERIENCE ───────────────────────────────────────────────────────────
  if (resume.experience?.length) {
    sectionHeading('EXPERIENCE')
    for (const exp of resume.experience) {
      twoCol(exp.title, exp.dates, 'bold')
      twoCol(exp.company, exp.location, 'italic')
      y += 2
      for (const b of exp.bullets) bullet(b)
      y += 5
    }
  }

  // ── PROJECTS ─────────────────────────────────────────────────────────────
  if (resume.projects?.length) {
    sectionHeading('PROJECTS')
    for (const proj of resume.projects) {
      need(14)
      doc.setFont('times', 'bold')
      doc.setFontSize(10.5)
      doc.text(proj.name, ML, y)
      y += 13
      for (const b of proj.bullets) bullet(b)
      y += 5
    }
  }

  // ── EDUCATION ────────────────────────────────────────────────────────────
  if (resume.education?.length) {
    sectionHeading('EDUCATION')
    for (const edu of resume.education) {
      twoCol(edu.institution, edu.dates, 'bold')
      twoCol(edu.degree, edu.location, 'italic')
      y += 2
      for (const b of edu.bullets) bullet(b)
      y += 5
    }
  }

  // ── CERTIFICATIONS ───────────────────────────────────────────────────────
  if (resume.certifications?.length) {
    sectionHeading('CERTIFICATIONS')
    for (const cert of resume.certifications) {
      need(13)
      doc.setFont('times', 'normal')
      doc.setFontSize(10)
      doc.text('•', BULLET_X, y)
      doc.text(cert, TEXT_X, y)
      y += 13
    }
  }

  // ── SKILLS ───────────────────────────────────────────────────────────────
  if (resume.skills) {
    sectionHeading('SKILLS')
    doc.setFont('times', 'normal')
    doc.setFontSize(10)
    const lines = doc.splitTextToSize(resume.skills, CW) as string[]
    for (const line of lines) {
      need(12)
      doc.text(line, ML, y)
      y += 12
    }
  }

  const slug = jobTitle
    ? jobTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    : 'resume'
  doc.save(`${resume.name.replace(/\s+/g, '-')}-${slug}.pdf`)
}
