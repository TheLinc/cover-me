// Shared with the website. Edit here, then run `node scripts/sync-pdf.mjs`,
// which copies this folder to web/lib/pdf/ (both builds fail on a stale copy).
//
// "Your design" (#131): tailors the text inside the user's own Word file and
// keeps everything else about it. The parse copies bullets verbatim, so each
// parsed bullet is found as the paragraph with the same text. A tailored
// bullet replaces that paragraph's text: it goes into the run that held most of
// the text and the other runs are emptied (a bold lead-in goes plain).
// The upload check is this same function without a tailored resume.
//
// String scanning, not DOMParser: the tailor runs in the service worker,
// which has no DOM.
import { resumeFileName, saveFile } from './file-name'
import type { TailoredResume } from './types'

export interface DesignCheck {
  matched: number // bullets found as their own paragraph
  total: number // bullets in the parse (experience and projects)
  unmatched: string[] // bullets that stay as written
  textBoxBullets: number // of those, how many sit in text boxes
  summary: boolean // the file has a summary paragraph
  skills: 'reordered' | 'table' | 'split' | 'none'
  layoutWarning?: 'columns' | 'table' | 'textbox' // may be read out of order by application systems
}

// Below this share of bullets matched, the file isn't edited.
export const DESIGN_MIN_MATCH = 0.8

export function designUsable(check: DesignCheck): boolean {
  return check.total > 0 && check.matched / check.total >= DESIGN_MIN_MATCH
}

type Source = Pick<TailoredResume, 'experience' | 'projects' | 'skills'>

interface TextRun { tagStart: number; contentStart: number; contentEnd: number; text: string }
interface Para {
  start: number
  end: number
  runs: TextRun[]
  text: string
  inTable: boolean
  inTextBox: boolean
  cell: number // the table cell it sits in, -1 outside tables
  keep: boolean // holds the section's settings: emptied, never removed
}

// Tailors file's text from tailored (when given) and reports what could be
// matched. bytes is missing when there's nothing to write or the file
// shouldn't be edited (designUsable is false).
export async function tailorDesign(
  file: Uint8Array | ArrayBuffer,
  parsed: Source,
  tailored?: Source & { summary?: string },
): Promise<{ check: DesignCheck; bytes?: Uint8Array }> {
  const { default: JSZip } = await import('jszip') // loaded on first use
  const zip = await JSZip.loadAsync(file)
  const entry = zip.file('word/document.xml')
  if (!entry) throw new Error('This file isn’t a Word document.')
  const xml = await entry.async('string')
  const { paras, layoutWarning } = scan(xml)
  const cellCount = new Map<number, number>()
  for (const p of paras) if (p.cell >= 0) cellCount.set(p.cell, (cellCount.get(p.cell) ?? 0) + 1)

  // Each parsed bullet, in order, takes the first unused paragraph with its text.
  const byText = new Map<string, number[]>()
  const inBoxes = new Set<string>()
  paras.forEach((p, i) => {
    const key = norm(p.text)
    if (!key) return
    if (p.inTextBox) inBoxes.add(key)
    else byText.set(key, [...(byText.get(key) ?? []), i])
  })
  const used = new Set<number>()
  const take = (text: string): number | undefined => {
    const i = byText.get(norm(text))?.find((j) => !used.has(j))
    if (i !== undefined) used.add(i)
    return i
  }
  const unmatched: string[] = []
  let textBoxBullets = 0
  let total = 0
  const slotsOf = (bullets: string[]): number[] => bullets.flatMap((b) => {
    total++
    const i = take(b)
    if (i !== undefined) return [i]
    unmatched.push(b)
    if (inBoxes.has(norm(b))) textBoxBullets++
    return []
  })
  const roles = parsed.experience.map((r) => slotsOf(r.bullets))
  const projects = (parsed.projects ?? []).map((r) => slotsOf(r.bullets))
  const firstBullet = Math.min(...used, paras.length)

  const summaryAt = findSummary(paras, used, firstBullet)
  const skills = findSkills(paras, used, parsed.skills)

  const check: DesignCheck = {
    matched: total - unmatched.length,
    total,
    unmatched,
    textBoxBullets,
    summary: summaryAt !== undefined,
    skills: skills.state,
    ...(layoutWarning ? { layoutWarning } : {}),
  }
  if (!tailored) return { check }
  // A tailored resume from a different parse (other roles) can't be placed.
  const aligned = tailored.experience.length === parsed.experience.length &&
    tailored.experience.every((r, i) => r.title === parsed.experience[i].title && r.company === parsed.experience[i].company) &&
    (tailored.projects ?? []).length === (parsed.projects ?? []).length
  if (!aligned) return { check: { ...check, matched: 0, unmatched: allBullets(parsed) } }
  if (!designUsable(check)) return { check }

  const edits: Edit[] = []
  const setText = (i: number, text: string) => edits.push(...replaceText(paras[i], text))
  const drop = (i: number) => {
    const p = paras[i]
    if (p.keep || (p.cell >= 0 && cellCount.get(p.cell) === 1)) setText(i, '')
    else edits.push({ start: p.start, end: p.end, text: '' })
  }
  // Slot k of an entry takes its tailored bullet k (the tailor reorders bullets
  // within a role). A bullet the tailor dropped removes its paragraph.
  // ponytail: a role with an unmatched bullet fills its matched slots with the
  // first tailored bullets, so the rewrite of the unmatched one can be lost or
  // doubled; marking which tailored bullet came from which needs the model.
  const fill = (slots: number[], bullets: string[]) => slots.forEach((i, k) => (k < bullets.length ? setText(i, bullets[k]) : drop(i)))
  roles.forEach((slots, i) => fill(slots, tailored.experience[i].bullets))
  projects.forEach((slots, i) => fill(slots, tailored.projects![i].bullets))
  if (summaryAt !== undefined && tailored.summary?.trim()) setText(summaryAt, tailored.summary.trim())
  if (skills.at !== undefined && tailored.skills?.trim()) {
    // A label in runs of its own ("Skills: " in bold) keeps them.
    const p = paras[skills.at]
    let k = 0
    let label = ''
    while (k < p.runs.length && label.length < skills.label.length) label += p.runs[k++].text
    if (skills.label && label === skills.label && k < p.runs.length) edits.push(...replaceText({ ...p, runs: p.runs.slice(k), text: '' }, tailored.skills.trim()))
    else setText(skills.at, skills.label + tailored.skills.trim())
  }

  let out = xml
  for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end)
  zip.file('word/document.xml', out)
  return { check, bytes: await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }) }
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

// Downloads resume tailored inside the user's file. False when the file can't
// take it; the caller then offers the Cover Me layout.
export async function downloadDesignDocx(file: Uint8Array | ArrayBuffer, parsed: Source, resume: TailoredResume, jobTitle?: string): Promise<boolean> {
  const { bytes } = await tailorDesign(file, parsed, resume)
  if (!bytes) return false
  saveFile(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: DOCX_MIME }), resumeFileName(resume, jobTitle, 'docx'))
  return true
}

const allBullets = (r: Source) => [...r.experience, ...(r.projects ?? [])].flatMap((e) => e.bullets)

interface Edit { start: number; end: number; text: string }

// The new text goes into the run that held the most text, after any bullet
// glyph typed at the start; the paragraph's other runs are emptied.
function replaceText(p: Para, text: string): Edit[] {
  const glyph = p.text.match(LEADING_GLYPH)?.[0] ?? ''
  const main = p.runs.reduce((a, b) => (b.text.length > a.text.length ? b : a))
  return p.runs.map((r) => ({
    start: r.tagStart,
    end: r.contentEnd,
    text: `<w:t xml:space="preserve">${r === main ? escapeXml(glyph + text) : ''}`,
  }))
}

const SUMMARY_HEADING = /^(professional |career |executive )?(summary|profile|objective|about me|overview)( of qualifications)?:?$/i
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

// The paragraph under a Summary/Profile heading, or else a long paragraph of
// prose above the first bullet. The parse leaves the summary out, so the file
// is the only place to find it.
function findSummary(paras: Para[], used: Set<number>, firstBullet: number): number | undefined {
  const free = (i: number) => !used.has(i) && !paras[i].inTextBox && paras[i].text.trim() !== ''
  const h = paras.findIndex((p) => !p.inTextBox && SUMMARY_HEADING.test(p.text.trim()))
  if (h >= 0) {
    // The first paragraph with text under the heading, if it's prose.
    for (let i = h + 1; i < paras.length; i++) {
      if (paras[i].inTextBox || !paras[i].text.trim()) continue
      return free(i) && words(paras[i].text) >= 8 ? i : undefined
    }
  }
  for (let i = 0; i < firstBullet; i++) if (free(i) && words(paras[i].text) >= 25) return i
  return undefined
}

// Skills are replaced only when the parse's skills text is one paragraph,
// optionally after a short label ("Skills: ").
function findSkills(paras: Para[], used: Set<number>, skills: string | undefined): { state: DesignCheck['skills']; at?: number; label: string } {
  if (!skills?.trim()) return { state: 'none', label: '' }
  const want = norm(skills)
  for (let i = 0; i < paras.length; i++) {
    const p = paras[i]
    if (used.has(i) || p.inTextBox) continue
    const have = norm(p.text)
    if (have === want) return { state: 'reordered', at: i, label: '' }
    const label = p.text.match(/^[^:]{1,40}:\s*/)?.[0]
    if (label && norm(p.text.slice(label.length)) === want) return { state: 'reordered', at: i, label }
  }
  const first = norm(skills.split(/[,;|•\n]/)[0])
  const inTable = !!first && paras.some((p) => p.inTable && norm(p.text).includes(first))
  return { state: inTable ? 'table' : 'split', label: '' }
}

const LEADING_GLYPH = /^[\s•·▪▫◦●■□‣⁃➢→–—*>-]+/

// Compares text the way the parse may have copied it: quotes, dashes, spaces,
// a typed bullet glyph, a final full stop and case don't count.
export function norm(s: string): string {
  return s.normalize('NFKC')
    .replace(LEADING_GLYPH, '')
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.;,]$/, '')
    .toLowerCase()
}

const TAG = /<(\/?)([A-Za-z][\w.-]*(?::[\w.-]+)?)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g

// Every paragraph with its text runs, and whether the layout uses columns,
// tables or text boxes. Paragraphs inside a text box nest inside an outer
// paragraph; each run belongs to its innermost paragraph.
function scan(xml: string): { paras: Para[]; layoutWarning?: DesignCheck['layoutWarning'] } {
  const paras: Para[] = []
  const stack: string[] = []
  const open: Para[] = []
  const pieces = new Map<Para, string[]>()
  const cells: number[] = []
  const rows: { cells: number; cellHasText: boolean }[] = []
  let nextCell = 0
  let columns = false
  let table = false
  let textbox = false
  let textStart = -1
  let textTag = -1

  for (const m of xml.matchAll(TAG)) {
    const [whole, closing, name, attrs, selfClosing] = m
    const at = m.index!
    const end = at + whole.length
    const para = open[open.length - 1]
    if (closing) {
      if (name === 'w:t' && para && textStart >= 0) {
        const text = decodeXml(xml.slice(textStart, at))
        para.runs.push({ tagStart: textTag, contentStart: textStart, contentEnd: at, text })
        pieces.get(para)!.push(text)
        textStart = -1
      } else if (name === 'w:p' && para) {
        open.pop()
        para.end = end
        para.text = pieces.get(para)!.join('')
        if (para.runs.length) paras.push(para)
        if (para.text.trim()) {
          if (para.inTextBox) textbox = true
          else if (para.inTable) { table = true; if (rows.length) rows[rows.length - 1].cellHasText = true }
        }
      } else if (name === 'w:tc') {
        cells.pop()
        const row = rows[rows.length - 1]
        if (row?.cellHasText) { row.cells++; row.cellHasText = false }
      } else if (name === 'w:tr') {
        if ((rows.pop()?.cells ?? 0) >= 2) columns = true
      }
      // Pop back to the matching element (tolerates odd nesting).
      const k = stack.lastIndexOf(name)
      if (k >= 0) stack.length = k
      continue
    }
    if (name === 'w:p' && !selfClosing) {
      const p: Para = {
        start: at, end: at, runs: [], text: '',
        inTable: stack.includes('w:tbl'),
        inTextBox: stack.includes('w:txbxContent') || stack.includes('v:textbox'),
        cell: cells[cells.length - 1] ?? -1,
        keep: false,
      }
      open.push(p)
      pieces.set(p, [])
    } else if (name === 'w:t' && !selfClosing && para) {
      textTag = at
      textStart = end
    } else if ((name === 'w:tab' || name === 'w:br' || name === 'w:cr') && stack[stack.length - 1] === 'w:r' && para) {
      pieces.get(para)!.push(' ')
    } else if (name === 'w:sectPr' && para) {
      para.keep = true
    } else if (name === 'w:cols' && /w:num="([2-9]|\d\d)"/.test(attrs)) {
      columns = true
    } else if (name === 'w:tc' && !selfClosing) {
      cells.push(nextCell++)
    } else if (name === 'w:tr' && !selfClosing) {
      rows.push({ cells: 0, cellHasText: false })
    }
    if (!selfClosing) stack.push(name)
  }
  const layoutWarning = columns ? 'columns' : textbox ? 'textbox' : table ? 'table' : undefined
  return { paras, layoutWarning }
}

function decodeXml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10))
    return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" } as Record<string, string>)[e.toLowerCase()]
  })
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
