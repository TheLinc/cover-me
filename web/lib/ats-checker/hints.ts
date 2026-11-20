import { isSectionHeading } from './keywords'

export interface ResumeChecks {
  bullets: { total: number; withoutNumber: string[] }
  title: { posting: string; core: string; onResume: boolean } | null
  email: boolean
  phone: boolean
}

type Section = 'top' | 'experience' | 'other'
const EXPERIENCE = /^((professional|work|relevant|clinical|employment|career)\s+)?(experience|history)$|^employment( history)?$|^(selected |personal )?projects$/i
const OTHER_SECTION = /^education( and training)?$|^training$|^((key|core|technical)\s+)?(skills|competencies)( and \w+)?$|^(licen[cs]es?|certifications?)(\s*(&|and)\s*\w+)?$|^((personal|professional|career)\s+)?(profile|summary|objective)$|^(awards|volunteer(ing)?|languages|interests|publications|references)$/i

const MONTH = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?'
const DATE = `(?:${MONTH}\\s+\\d{4}|\\d{1,2}/\\d{4}|\\d{4}|(?:spring|summer|fall|autumn|winter)\\s+\\d{4})`
const RANGE = new RegExp(`(${DATE})\\s*(?:–|—|-|to|until)\\s*(${DATE}|present|current|now|today)`, 'gi')
const GLYPH = /^\s*[-•●◦▪■·*–]\s*/
const MINOR = /^(a|an|and|at|by|for|in|of|on|or|the|to|with|&)$/i

function sectionOf(line: string): Section | null {
  const text = line.replace(/[:\s]+$/, '').trim()
  if (text.split(/\s+/).length > 4) return null
  if (EXPERIENCE.test(text)) return 'experience'
  if (OTHER_SECTION.test(text)) return 'other'
  return null
}

const titleCase = (line: string) =>
  line.split(/[\s,·|]+/).filter((w) => /^[A-Za-z]/.test(w) && !MINOR.test(w)).every((w) => /^[A-Z]/.test(w))

export function resumeBullets(resume: string): string[] {
  let section: Section = 'top'
  const lines: string[] = []
  for (const raw of resume.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const s = sectionOf(line)
    if (s) section = s
    else if (section === 'experience') lines.push(line)
  }
  const marked = lines.some((l) => GLYPH.test(l))
  const out: string[] = []
  let open = false
  for (const line of lines) {
    const header = !(marked && GLYPH.test(line)) && (new RegExp(RANGE.source, 'i').test(line) || / \| /.test(line))
    const continues = open && (marked ? /^[a-z0-9(]/ : /^[a-z0-9(%$]/).test(line)
    const starts = marked ? GLYPH.test(line) : line.split(/\s+/).length >= 4 && !titleCase(line)
    if (header) open = false
    else if (continues && !GLYPH.test(line)) out[out.length - 1] += ` ${line}`
    else if (starts) {
      out.push(line.replace(GLYPH, ''))
      open = true
    } else open = false
  }
  return out
}

const NUMBER_WORD = /\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|(thir|four|fif|six|seven|eigh|nine)teen|(twen|thir|for|fif|six|seven|eigh|nine)ty|(hundred|thousand|million|billion|dozen)s?|doubled?|tripled?|halved|zero)\b/i
const NOT_A_MEASURE = [
  new RegExp(RANGE.source, 'gi'),
  /\b(19[5-9]\d|20[0-3]\d)\b/g,
  /\b[A-Za-z]+\d+[A-Za-z]*\b/g,
  /\b\d+(?!(k|m|bn?|x|h|hrs?|hours?|mins?|days?|wks?|weeks?|mos?|months?|yrs?|years?|ft|ms|s|mm|cm|km|kg|lbs?|mph|gb|tb|mb|st|nd|rd|th)\b)[A-Za-z]+\b/gi,
  /\b(ISO|OSHA|Section|Title|Level|Tier|Grade|Class|Phase|Windows|Office|Part|Form|Rule|Chapter|Step|Series|Article|Revit|Python|Java|Angular|Vue|WCAG)\s*[\d.]+(-hour)?\b/gi,
  /\b401\s*\(k\)/gi,
]

export function hasNumber(bullet: string): boolean {
  const rest = NOT_A_MEASURE.reduce((s, re) => s.replace(re, ' '), bullet)
  return /\d/.test(rest) || NUMBER_WORD.test(rest)
}

const coreTitle = (title: string) =>
  title.replace(/^(senior|sr\.?|junior|jr\.?|lead|principal|staff|entry[- ]level)\s+/i, '').replace(/\s+(i{1,3}|iv|[1-4])$/i, '').trim()

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const mentionsTitle = (text: string, title: string) =>
  new RegExp(`(?<![A-Za-z0-9])${title.split(/\s+/).map(escapeRe).join('\\s+')}s?(?![A-Za-z0-9])`, 'i').test(text)

const titleOnly = (line: string) => line.split(/,| [-–—|] |\(/)[0].trim()

export function postingTitle(posting: string): string | null {
  const lines = posting.split('\n').map((l) => l.replace(/^[#*\s]+|[*\s]+$/g, ''))
  const filled = lines.flatMap((l, i) => (l ? [i] : [])).slice(0, 4)
  for (const at of filled) {
    const title = titleOnly(lines[at])
    if (isSectionHeading(title) || /^(job\s+)?(description|summary|overview|details)$/i.test(title)) return null
    if (/\b(program|programme|fellowship|cohort|bootcamp)\b/i.test(title)) return null
    if (!title || /[.!?:]$/.test(title) || /^(at|about|join|we|our)\b/i.test(title) || title.split(/\s+/).length > 8) continue
    const rest = lines.slice(at + 1).join('\n')
    if (mentionsTitle(rest, coreTitle(title)) && !namesEmployer(rest, title)) return title
  }
  return null
}

// Many pasted postings open with the employer's name, which the posting then repeats (#296).
function namesEmployer(text: string, name: string) {
  const n = name.split(/\s+/).map(escapeRe).join('\\s+')
  return new RegExp(`\\b(about|at|join)\\s+${n}\\b|${n}\\s+is\\s+(an?\\s+equal|hiring|proud)\\b`, 'i').test(text)
}

export function checkResumeText(resume: string, posting: string, known?: string): ResumeChecks {
  const bullets = resumeBullets(resume)
  const title = (known && titleOnly(known)) || postingTitle(posting)
  return {
    bullets: { total: bullets.length, withoutNumber: bullets.filter((b) => !hasNumber(b)) },
    title: title ? { posting: title, core: coreTitle(title), onResume: mentionsTitle(resume, coreTitle(title)) } : null,
    email: /[\w.+-]+@[\w-]+\.[\w.]+/.test(resume),
    phone: [...resume.matchAll(/\+?\(?\d[\d \t().-]{6,18}\d/g)].some(([m]) => {
      const digits = m.replace(/\D/g, '').length
      return digits <= 15 && digits >= (m.startsWith('+') ? 9 : 10)
    }),
  }
}
