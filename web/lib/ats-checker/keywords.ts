import { TERMS } from './terms'

export type Level = 'required' | 'preferred' | 'mentioned'
export interface Keyword {
  name: string
  spellings: string[]
  strict: boolean
  level: Level
  alternatives?: string[]
  line?: string
}
export interface Posting {
  keywords: Keyword[]
  years: string[]
}

const LEVELS: Level[] = ['required', 'preferred', 'mentioned']

const DICTIONARY = TERMS.map((t) => {
  const strict = t.startsWith('=')
  const spellings = (strict ? t.slice(1) : t).split('|')
  return { name: spellings[0], spellings, strict }
})

const normalize = (s: string) => s.replace(/[‘’`]/g, "'").replace(/\p{Zs}/gu, ' ')
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const patterns = new Map<string, RegExp>()
function pattern(spelling: string, strict: boolean): RegExp {
  const key = `${strict}|${spelling}`
  const cached = patterns.get(key)
  if (cached) return cached
  const body = spelling.split(/[\s-]+/).map(escapeRe).join('[\\s-]+')
  const caseSensitive = strict || !/[a-z]/.test(spelling)
  const after = strict ? '(?![A-Za-z0-9]|-to-)' : '(?![A-Za-z0-9])'
  const re = new RegExp(`(?<![A-Za-z0-9])${body}s?${after}`, caseSensitive ? 'g' : 'gi')
  patterns.set(key, re)
  return re
}

type Term = Pick<Keyword, 'spellings' | 'strict'>
const spans = (text: string, k: Term): Array<[number, number]> =>
  k.spellings.flatMap((s) => [...text.matchAll(pattern(s, k.strict))].map((m): [number, number] => [m.index, m.index + m[0].length]))
const mentions = (text: string, spelling: string, strict: boolean) => text.search(pattern(spelling, strict)) >= 0
const has = (text: string, k: Term) => k.spellings.some((s) => mentions(text, s, k.strict))

const PREFERRED = /prefer|nice[\s-]to[\s-]have|nice if|bonus|\bplus\b|desired|desirable|stand out|advantage|may also|good to have|ideally|even better|pluses|extra credit|would be great/i
const REQUIRED = /requir|qualif|\bmust\b|need|bring|you have|you'?ll have$|you should have|looking for|good fit|great fit|about you|who you are|who you'?ll be|minimum|skills|education|^((your|relevant|work|professional) )?experience( and \w+)?$|you are$|you'?re a|we'?d love to hear|things you|ideal candidate|about the candidate|^tech stack|profile|background|essential|person specification|competenc|to be successful|sets you apart|right candidate|is this you|seeking/i
const CREDENTIALS = /^certifications?|^licen[sc]|certifications?$/i
const COMPANY = /^(about (?!you|the role|the team|the job|this job|this role|the position|the candidate|the opportunity|the work)|more about|why\b|life at|who we are$|our (founding|story|culture|values)|how we work)/i
const HEADING_START = /^(more about|about us|why (join|work)|life at|what (you|we|makes you|sets you)|it would be (great|nice)|it'?d be (great|nice)|you'?ll\b|you (should|might|may)\b|who you|about (you|the (role|candidate|team|job|opportunity))|your (profile|background)|candidate profile|nice to haves?|good to haves?|what would make you|job requirements|your qualifications|(the )?skills you|(the )?ideal candidate|knowledge and skills|bonus|requirements|qualifications|key (responsibilities|requirements|qualifications)|responsibilities|preferred|desirable|essential|ideally|even better|must[- ]haves?|minimum|basic qualifications|required|competencies|person specification|to be successful|the ideal candidate|the role|the opportunity|job description|tech stack|extra credit|pluses|who we('re| are) (looking|seeking)|we('re| are) (looking|seeking)|is this you|the right candidate|here'?s what you|you'?re a (great|good)|skills you|things you|a bit about you|we'?d love to hear|you bring)\b/i
const HEADING_WHOLE = /^(((key|technical|desired|core|required|your|relevant|work|professional) )?(skills|experience|education)( and \w+)?|you (are|have|will need|must have)|the (job|team|position)|your mission)$/i
const MINOR_WORD = /^(a|an|and|at|by|for|if|in|is|of|on|or|the|to|with)$/i

// A body line pasted without its bullet can start like a heading ("Compensation analysis
// experience"), so a heading needs a colon, markdown, title case or a heading-only phrase (#278).
function looksLikeHeading(text: string, labelled: boolean): boolean {
  if (labelled || HEADING_START.test(text) || HEADING_WHOLE.test(text)) return true
  const words = text.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w) && !MINOR_WORD.test(w))
  return words.length > 0 && words.every((w) => /^[A-Z]/.test(w))
}
const SKIP = /^(description of )?benefits?|^perks|what we offer|^compensation|^pay( range| transparency|$)|^salary|equal (opportunity|employment)|^our commitment|^acknowledg|statement$|^accommodations?|^privacy|career growth$|^work\/life|^inclusive|^diverse|^apply$|^contact/i
const BULLET = /^(\*\s|[-•●◦▪▫■□·‣⁃▸►○–—])/
const OTHER = /^schedule|^job type|^the (job|team|position)$|^your mission|responsib|what you('ll| will)? (do|be doing)|day in the life|the role|the opportunity|job description|overview|summary|duties|additional information/i

export const isSectionHeading = (line: string) => {
  const text = line.replace(/^[^A-Za-z0-9]+|[*:\s]+$/g, '')
  return [HEADING_START, HEADING_WHOLE, COMPANY, SKIP, OTHER].some((re) => re.test(text))
}

type Heading = Level | 'skip' | 'unknown' | 'company'
function headingLevel(line: string, labelled: boolean): Heading | null {
  if (BULLET.test(line)) return null
  const text = line.replace(/^[^A-Za-z0-9]+|[*:\s]+$/g, '')
  if (!text || /[.!]$/.test(text) || text.split(/\s+/).length > 10) return null
  const marked = labelled || /^(#|\*\*)|:\s*$/.test(line)
  if (!marked && /\d/.test(text)) return null
  if (!looksLikeHeading(text, marked)) return null
  if (COMPANY.test(text)) return 'company'
  const namedHeading = /^((required|preferred|minimum|basic) (qualifications|requirements|skills|experience)|.*\b(requirements|qualifications)|.*\b(looking for|seeking))$/i.test(text)
  if (!namedHeading && DICTIONARY.some((term) => has(text, term))) return null
  if (!namedHeading && SKIP.test(text)) return 'skip'
  if (PREFERRED.test(text)) return 'preferred'
  if (REQUIRED.test(text) || CREDENTIALS.test(text)) return 'required'
  if (OTHER.test(text)) return 'mentioned'
  return 'unknown'
}

const ACRONYM_STOP = new Set(['USD', 'GBP', 'CAD', 'EUR', 'PTO', 'EEO', 'EOE', 'FAQ', 'LLC', 'INC', 'USA', 'EMEA', 'APAC', 'NYC', 'CEO', 'CTO', 'CFO', 'COO', 'ETC', 'AND', 'THE', 'FOR', 'NOT', 'DNA', 'EST', 'PST', 'CST', 'MST', 'ASAP', 'III', 'SME',
  'MUST', 'PLEASE', 'NOTE', 'ONLY', 'NEVER', 'WILL', 'ALL', 'ANY', 'YOU', 'YOUR', 'ARE', 'CAN', 'MAY', 'NEW', 'NOW', 'COVID', 'TBD', 'TBA', 'H1B'])

function unlistedNames(line: string): Keyword[] {
  const letters = line.replace(/[^A-Za-z]/g, '')
  if (letters.length && letters.replace(/[^A-Z]/g, '').length / letters.length > 0.5) return []
  const found: Keyword[] = []
  for (const [token] of line.matchAll(/\b[A-Z][A-Za-z0-9]*[A-Z][A-Za-z0-9]*\b/g)) {
    const plural = /^[A-Z]{2,}s$/.test(token)
    const name = plural ? token.slice(0, -1) : token
    const acronym = !/[a-z]/.test(name)
    if (acronym && (name.length < 3 || name.length > 6 || ACRONYM_STOP.has(name))) continue
    const spellings = [name]
    if (acronym) {
      const long = new RegExp(`((?:[A-Z][a-z]+\\s+){${name.length}})\\(${token}\\)`).exec(line)?.[1].trim()
      if (long && long.split(/\s+/).map((w) => w[0]).join('') === name) spellings.push(long)
    }
    found.push({ name, spellings, strict: acronym, level: 'required' })
  }
  return found
}

const TRAIT = String.raw`\b(race|colou?r|religion|creed|sex(ual orientation)?|gender|age|national origin|ancestry|disability|veteran)\b`
const BOILERPLATE = new RegExp(
  [
    String.raw`equal[- ](opportunity|employment)(?! (laws?|legislation|regulations?|compliance|polic))`,
    String.raw`affirmative[- ]action (employer|program)`,
    String.raw`\bEOE\b`,
    String.raw`(regardless of|without regard to)[^.]{0,60}${TRAIT}[^.]{0,80}${TRAIT}`,
    'Americans with Disabilities|reasonable accommodation|VEVRAA|OFCCP|E-Verify|eligibility to work|employment eligibility',
    'discriminat(?!ive)|protected veteran|pay transparency|know your rights|map data ©',
  ].join('|'),
  'i',
)
const HIRING_ACCESS = /(?=.*\b(accommodat|disabilit))(?=.*\b(applicants?\b|interview|hiring|recruit|onboard|human resources))/i
const YEARS = /\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s*\+?\s*(?:(?:-|–|to)\s*\d{1,2}\s*\+?\s*)?(?:years?|yrs?)\b/i
const COMPANY_VOICE = /\b([Ww]e|[Oo]ur|[Uu]s)\b/
const COMPANY_SPEAKS = /^[^A-Za-z]*(we|our)\b/i
const ASKS = /\bwe('re| are)? (looking|seeking|need|require|want|expect)\b/i

export function readPosting(posting: string): Posting {
  const found = new Map<string, Keyword>()
  let current = ''
  const add = (k: Keyword) => {
    const seen = found.get(k.name)
    if (!seen) found.set(k.name, { ...k, line: current })
    else if (LEVELS.indexOf(k.level) < LEVELS.indexOf(seen.level)) [seen.level, seen.line] = [k.level, current]
  }
  const years: string[] = []
  const links: Array<[string, string, Level]> = []
  let section: Level | 'skip' = 'mentioned'
  let aboutCompany = false
  const addYears = (text: string) => {
    if (!YEARS.test(text) || /years?\s+(of\s+age|old)/i.test(text) || (section === 'mentioned' && !/experience/i.test(text))) return
    const plain = text.replace(/^[-•●◦▪▫■□·‣⁃▸►○–—*#\s]+/, '').replace(/\*\*/g, '')
    const start = plain.length > 160 ? Math.max(0, Math.min(plain.search(YEARS) - 60, plain.length - 157)) : 0
    const quote = plain.length > 160 ? `${start ? '...' : ''}${plain.slice(start, start + 157).trim()}${start + 157 < plain.length ? '...' : ''}` : plain
    if (!years.includes(quote)) years.push(quote)
  }

  const lines = normalize(posting).split(/\n+/).map((l) => l.trim()).filter(Boolean)
  const openers = new Set(lines.map((l) => /^\w+/.exec(l)?.[0]))

  function scan(text: string, level: Level, names = level !== 'mentioned') {
    const hits = DICTIONARY.map((term) => ({ term, at: spans(text, term) })).filter((h) => h.at.length)
    const kept = hits
      .filter(({ term, at }) => !at.every(([a, b]) => hits.some((h) => h.term !== term && h.at.some(([c, d]) => c <= a && b <= d && d - c > b - a))))
      .sort((x, y) => Math.min(...x.at.map(([a]) => a)) - Math.min(...y.at.map(([a]) => a)))
    for (const { term } of kept) add({ ...term, level })
    for (const k of names ? unlistedNames(text) : []) {
      const known = [...DICTIONARY, ...found.values()].some((f) => has(k.name, f) || f.spellings.some((s) => mentions(s, k.name, true)))
      if (found.has(k.name) || (!known && !openers.has(k.name))) add({ ...k, level })
    }
    if (level === 'mentioned') return
    for (const a of kept) {
      for (const b of kept) {
        const either = a !== b && a.at.some(([, end]) => b.at.some(([start]) => start > end && /^,?\s+or\s+$/i.test(text.slice(end, start))))
        if (either) links.push([a.term.name, b.term.name, level])
      }
    }
  }

  for (const line of lines) {
    const [, head, rest] = /^([^:]{1,60}):\s*(\S.*)$/.exec(line) ?? []
    const heading = headingLevel(head ?? line, !!head)
    if (heading === 'skip' && head) continue
    const credentialsUnderPreferred = section === 'preferred' && CREDENTIALS.test((head ?? line).replace(/[*:\s]+$/, ''))
    if (heading === 'unknown') {
      if (section === 'skip' && !head) [section, aboutCompany] = ['mentioned', false]
    } else if (heading && !credentialsUnderPreferred) [section, aboutCompany] = heading === 'company' ? ['mentioned', true] : [heading, false]
    if (section === 'skip' && !heading && !head) {
      const terms = DICTIONARY.filter((term) => has(line, term)).length
      const shortLabel = !BULLET.test(line) && !/[.!?]$/.test(line) && line.split(/\s+/).length <= 8
      if (shortLabel || (BULLET.test(line) && terms >= 2)) [section, aboutCompany] = ['mentioned', false]
    }
    if (section === 'skip') continue
    const body = !heading ? line : head ? rest : ''
    if (!body) addYears(line)
    for (const sentence of body.split(/(?<=[.!?;])\s+(?=[A-Z])/)) {
      if (BOILERPLATE.test(sentence) || HIRING_ACCESS.test(sentence)) continue
      addYears(sentence)
      current = sentence.replace(/^[-•●◦▪▫■□·‣⁃▸►○–—*#\s]+/, '').replace(/\*\*/g, '')
      const ask = ASKS.exec(sentence)
      if (ask) {
        scan(sentence.slice(0, ask.index), 'mentioned')
        scan(sentence.slice(ask.index), section === 'preferred' ? 'preferred' : 'required')
        continue
      }
      const level: Level = section === 'mentioned' || (BULLET.test(line) ? COMPANY_SPEAKS : COMPANY_VOICE).test(sentence) ? 'mentioned'
        : /requir|\bmust\b/i.test(sentence) || !PREFERRED.test(sentence) ? section : 'preferred'
      scan(sentence, level, level !== 'mentioned' || (BULLET.test(line) && !aboutCompany && !COMPANY_SPEAKS.test(sentence)))
    }
  }

  for (const [a, b, level] of links) {
    const [ka, kb] = [found.get(a)!, found.get(b)!]
    if (ka.level !== level || kb.level !== level) continue
    ka.alternatives = [...new Set([...(ka.alternatives ?? []), kb.name])]
    kb.alternatives = [...new Set([...(kb.alternatives ?? []), ka.name])]
  }
  const keywords = [...found.values()].sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level))
  return { keywords, years }
}

export function checkResume(keywords: Keyword[], resume: string): Array<Keyword & { found: boolean; via?: string; mark?: string }> {
  const kept = marks(resume, keywords)
  const byName = new Map(keywords.map((k) => [k.name, k]))
  const markOf = (k: Keyword) => markFor(resume, kept, k)
  return keywords.map((k) => {
    const own = markOf(k)
    if (own) return { ...k, found: true, mark: own }
    for (const name of k.alternatives ?? []) {
      const alt = byName.get(name)
      const mark = alt && markOf(alt)
      if (mark) return { ...k, found: true, via: name, mark }
    }
    return { ...k, found: false }
  })
}

export function oneEntryPerAsk<T extends Keyword>(keywords: T[]): T[] {
  const seen = new Set<string>()
  return keywords.filter((k) => {
    if (k.alternatives?.some((name) => seen.has(name))) return false
    seen.add(k.name)
    return true
  })
}

export const firstAt = (text: string, k: Term): number | undefined => spans(normalize(text), k)[0]?.[0]

export function markFor(text: string, kept: Mark[], k: Keyword): string | undefined {
  if (kept.some((m) => m.name === k.name)) return k.name
  const at = spans(normalize(text), k)
  return kept.find((m) => at.some(([start, end]) => start < m.end && end > m.start))?.name
}

export interface Mark {
  start: number
  end: number
  name: string
}

export function marks(text: string, keywords: Keyword[]): Mark[] {
  const plain = normalize(text)
  const all = keywords
    .flatMap((k) => spans(plain, k).map(([start, end]) => ({ start, end, name: k.name })))
    .sort((a, b) => a.start - b.start || b.end - a.end)
  const kept: Mark[] = []
  for (const m of all) if (!kept.length || m.start >= kept[kept.length - 1].end) kept.push(m)
  return kept
}
