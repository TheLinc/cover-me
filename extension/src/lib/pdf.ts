import { jsPDF } from 'jspdf'
import type { JobData } from '../types'

const PAGE_W = 612
const PAGE_H = 792
const MARGIN_X = 72  // 1 inch left/right
const MARGIN_T = 72  // 1 inch top
const MARGIN_B = 72  // 1 inch bottom
const USABLE_W = PAGE_W - MARGIN_X * 2
const USABLE_H = PAGE_H - MARGIN_T - MARGIN_B

// All spacing is expressed as multiples of fontSize so the whole layout
// scales proportionally when we shrink the font to enforce single-page.
const LINE_RATIO  = 1.45  // line height (~Word single-spaced)
const PARA_RATIO  = 0.80  // gap between paragraphs (~8pt at 11pt — standard block-letter format)
const HEAD_RATIO  = 1.60  // gap between header block and divider
const DIV_RATIO   = 1.10  // gap between divider and letter body

export function downloadCoverLetterPdf(letter: string, job: JobData, createdAt: string) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })

  const companyKnown = job.company && job.company !== 'Unknown Company'
  const paragraphs = letter.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  const date = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  // Try font sizes from 11pt down to 9pt until content fits one page.
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

  // ── Date ────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(fontSize)
  doc.setTextColor(110, 110, 110)
  doc.text(date, MARGIN_X, y)
  y += lh * 2

  // ── Company + role header ────────────────────────────────────────────
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

  // ── Divider ──────────────────────────────────────────────────────────
  doc.setDrawColor(210, 210, 210)
  doc.setLineWidth(0.5)
  doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y)
  y += lh * DIV_RATIO

  // ── Letter body ──────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(fontSize)
  doc.setTextColor(30, 30, 30)

  for (let i = 0; i < paragraphs.length; i++) {
    const lines = doc.splitTextToSize(paragraphs[i], USABLE_W) as string[]
    doc.text(lines, MARGIN_X, y)
    y += lines.length * lh
    if (i < paragraphs.length - 1) y += fontSize * PARA_RATIO
  }

  const prefix = companyKnown ? job.company : ''
  const slug = `${prefix}-${job.title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

  doc.save(`cover-letter-${slug}.pdf`)
}

// Dry-run the layout at a given font size and return the total height consumed.
function totalHeight(
  doc: jsPDF,
  paragraphs: string[],
  usableW: number,
  fontSize: number,
  companyKnown: boolean,
): number {
  doc.setFontSize(fontSize)
  const lh = fontSize * LINE_RATIO

  let h = lh * 2                          // date + gap
  h += lh * (companyKnown ? 1.1 : 0)     // company name
  h += lh                                  // role / title
  h += lh * HEAD_RATIO                    // gap to divider
  h += 1                                  // divider stroke (1pt)
  h += lh * DIV_RATIO                     // gap after divider

  for (let i = 0; i < paragraphs.length; i++) {
    const lines = doc.splitTextToSize(paragraphs[i], usableW) as string[]
    h += lines.length * lh
    if (i < paragraphs.length - 1) h += fontSize * PARA_RATIO
  }

  return h
}
