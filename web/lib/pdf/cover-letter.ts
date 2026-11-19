// Shared with the website. Edit here, then run `node scripts/sync-pdf.mjs`,
// which copies this folder to web/lib/pdf/ (both builds fail on a stale copy) (#27).
import { jsPDF } from 'jspdf'
import type { PdfJob } from './types'

const PAGE_W = 612
const PAGE_H = 792
const MARGIN_X = 72
const MARGIN_T = 72
const MARGIN_B = 72
const USABLE_W = PAGE_W - MARGIN_X * 2
const USABLE_H = PAGE_H - MARGIN_T - MARGIN_B

const LINE_RATIO  = 1.45
const PARA_RATIO  = 0.80
const HEAD_RATIO  = 1.60
const DIV_RATIO   = 1.10

export function downloadCoverLetterPdf(letter: string, job: PdfJob, createdAt: string) {
  const companyKnown = Boolean(job.company) && job.company !== 'Unknown Company'
  const prefix = companyKnown ? job.company : ''
  const slug = `${prefix}-${job.title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

  coverLetterPdf(letter, job, createdAt).save(`cover-letter-${slug}.pdf`)
}

// Also rendered outside the browser, from a "Flag a problem" report (#256).
export function coverLetterPdf(letter: string, job: PdfJob, createdAt: string): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })

  const companyKnown = Boolean(job.company) && job.company !== 'Unknown Company'
  const paragraphs = letter
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split(/\n\n+/)
    .map(p => p.replace(/\n/g, ' ').trim())
    .filter(p => p.length > 0)
  const date = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  let fontSize = 11
  for (let f = 11; f >= 9; f -= 0.25) {
    if (totalHeight(doc, paragraphs, USABLE_W, f, companyKnown) <= USABLE_H) {
      fontSize = f
      break
    }
    fontSize = 9
  }

  const lh = fontSize * LINE_RATIO
  let y = MARGIN_T

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(fontSize)
  doc.setTextColor(110, 110, 110)
  doc.text(date, MARGIN_X, y)
  y += lh * 2

  if (companyKnown) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(20, 20, 20)
    doc.text(job.company, MARGIN_X, y)
    y += lh * 1.1
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(90, 90, 90)
    doc.text(job.title || 'Job Application', MARGIN_X, y)
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(20, 20, 20)
    doc.text(job.title || 'Job Application', MARGIN_X, y)
  }
  y += lh * HEAD_RATIO

  doc.setDrawColor(210, 210, 210)
  doc.setLineWidth(0.5)
  doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y)
  y += lh * DIV_RATIO

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(fontSize)
  doc.setTextColor(30, 30, 30)

  // Line by line: jsPDF spaces an array of lines at 1.15×, not LINE_RATIO
  // (https://github.com/TheLinc/cover-me/commit/b5c6d60).
  for (let i = 0; i < paragraphs.length; i++) {
    const lines = doc.splitTextToSize(paragraphs[i], USABLE_W) as string[]
    for (const line of lines) {
      doc.text(line, MARGIN_X, y)
      y += lh
    }
    if (i < paragraphs.length - 1) y += fontSize * PARA_RATIO
  }

  return doc
}

function totalHeight(
  doc: jsPDF,
  paragraphs: string[],
  usableW: number,
  fontSize: number,
  companyKnown: boolean,
): number {
  doc.setFontSize(fontSize)
  const lh = fontSize * LINE_RATIO

  let h = lh * 2
  h += lh * (companyKnown ? 1.1 : 0)
  h += lh
  h += lh * HEAD_RATIO
  h += 1
  h += lh * DIV_RATIO

  for (let i = 0; i < paragraphs.length; i++) {
    const lines = doc.splitTextToSize(paragraphs[i], usableW) as string[]
    h += lines.length * lh
    if (i < paragraphs.length - 1) h += fontSize * PARA_RATIO
  }

  return h
}
