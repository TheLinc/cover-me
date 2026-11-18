import { TERMS } from './terms'

export type Level = 'required' | 'preferred' | 'mentioned'
export interface Keyword {
  name: string
  spellings: string[]
  strict: boolean
  level: Level
  alternatives?: string[]
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
  const after = strict ? '(?![A-Za-z0-9]|-[A-Za-z])' : '(?![A-Za-z0-9])'
  const re = new RegExp(`(?<![A-Za-z0-9])${body}s?${after}`, caseSensitive ? 'g' : 'gi')
  patterns.set(key, re)
  return re
}

type Term = Pick<Keyword, 'spellings' | 'strict'>
const spans = (text: string, k: Term): Array<[number, number]> =>
  k.spellings.flatMap((s) => [...text.matchAll(pattern(s, k.strict))].map((m): [number, number] => [m.index, m.index + m[0].length]))
const mentions = (text: string, spelling: string, strict: boolean) => text.search(pattern(spelling, strict)) >= 0
const has = (text: string, k: Term) => k.spellings.some((s) => mentions(text, s, k.strict))

const PREFERRED = /prefer|nice[\s-]to[\s-]have|nice if|bonus|\bplus\b|desired|stand out|advantage|may also/i
const REQUIRED = /requir|qualif|\bmust\b|need|bring|you have|looking for|good fit|about you|who you are|minimum|skills|education/i
const COMPANY = /^(about (?!you|the role|the team|the job|this role|the position)|more about|why\b|life at)/i
const SKIP = /^(description of )?benefits?|^perks|what we offer|^compensation|^pay( range| transparency|$)|^salary|equal (opportunity|employment)|^our commitment|^who we are|^our (founding|story|culture|values)|^how we work|^acknowledg|statement$|^accommodations?|^privacy|career growth$|^work\/life|^inclusive|^diverse|^apply$|^contact/i
const BULLET = /^(\*\s|[-•●◦▪▫■□·‣⁃▸►○–—])/
const OTHER =/responsib|what you('ll| will)? (do|be doing)|day in the life|the role|the opportunity|job description|overview|summary|duties|additional information/i

function headingLevel(line: string): Level | 'skip' | null {
  if (BULLET.test(line)) return null
  const text = line.replace(/^[#*\s]+|[*:\s]+$/g, '')
  if (!text || /[.!?]$/.test(text) || text.split(/\s+/).length > 8) return null
  if (COMPANY.test(text)) return 'skip'
  const namedHeading = /^(required|preferred|minimum|basic)\b|\b(requirements|qualifications)$/i.test(text)
  if (!namedHeading && DICTIONARY.some((term) => has(text, term))) return null
  if (SKIP.test(text)) return 'skip'
  if (PREFERRED.test(text)) return 'preferred'
  if (REQUIRED.test(text)) return 'required'
  if (OTHER.test(text)) return 'mentioned'
  return null
}

const ACRONYM_STOP = new Set(['USD', 'GBP', 'CAD', 'EUR', 'PTO', 'EEO', 'EOE', 'FAQ', 'LLC', 'INC', 'USA', 'EMEA', 'APAC', 'NYC', 'ADA', 'CEO', 'CTO', 'CFO', 'COO', 'ETC', 'AND', 'THE', 'FOR', 'NOT', 'DNA', 'EST', 'PST', 'CST', 'MST', 'ASAP', 'III'])

function unlistedNames(line: string): Keyword[] {
  const letters = line.replace(/[^A-Za-z]/g, '')
  if (letters.length && letters.replace(/[^A-Z]/g, '').length / letters.length > 0.5) return []
  const found: Keyword[] = []
  for (const [token] of line.matchAll(/\b[A-Z][A-Za-z0-9]*[A-Z][A-Za-z0-9]*\b/g)) {
    const acronym = !/[a-z]/.test(token)
    if (acronym && (token.length < 3 || token.length > 6 || ACRONYM_STOP.has(token))) continue
    const spellings = [token]
    if (acronym) {
      const long = new RegExp(`((?:[A-Z][a-z]+\\s+){${token.length}})\\(${token}\\)`).exec(line)?.[1].trim()
      if (long && long.split(/\s+/).map((w) => w[0]).join('') === token) spellings.push(long)
    }
    found.push({ name: token, spellings, strict: acronym, level: 'required' })
  }
  return found
}

const BOILERPLATE = /equal (opportunity|employment)|affirmative action|regardless of|without regard to/i
const YEARS = /\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s*\+?\s*(?:(?:-|–|to)\s*\d{1,2}\s*\+?\s*)?(?:years?|yrs?)\b/i

export function readPosting(posting: string): Posting {
  const found = new Map<string, Keyword>()
  const add = (k: Keyword) => {
    const key = k.name.toLowerCase()
    const seen = found.get(key)
    if (!seen) found.set(key, k)
    else if (LEVELS.indexOf(k.level) < LEVELS.indexOf(seen.level)) seen.level = k.level
  }
  const years: string[] = []
  let section: Level | 'skip' = 'mentioned'

  const lines = normalize(posting).split(/\n+/).map((l) => l.trim()).filter(Boolean)
  const openers = new Set(lines.map((l) => /^\w+/.exec(l)?.[0]))

  for (const line of lines) {
    const [, head, rest] = /^([^:]{1,60}):\s*(\S.*)$/.exec(line) ?? []
    const heading = headingLevel(head ?? line)
    if (heading) section = heading
    if (section === 'skip' || BOILERPLATE.test(line)) continue
    const body = !heading ? line : head ? rest : ''
    const companyVoice = /\b([Ww]e|[Oo]ur|[Uu]s)\b/.test(line)
    const level: Level = section === 'mentioned' || companyVoice ? 'mentioned'
      : /requir|\bmust\b/i.test(line) || !PREFERRED.test(line) ? section : 'preferred'
    const hits = DICTIONARY.map((term) => ({ term, at: spans(body, term) })).filter((h) => h.at.length)
    const kept = hits
      .filter(({ term, at }) => !at.every(([a, b]) => hits.some((h) => h.term !== term && h.at.some(([c, d]) => c <= a && b <= d && d - c > b - a))))
      .sort((x, y) => Math.min(...x.at.map(([a]) => a)) - Math.min(...y.at.map(([a]) => a)))
    for (const { term } of kept) add({ ...term, level })
    for (const a of kept) {
      for (const b of kept) {
        const either = a !== b && a.at.some(([, end]) => b.at.some(([start]) => start > end && /^,?\s+or\s+$/i.test(body.slice(end, start))))
        if (!either) continue
        const [ka, kb] = [found.get(a.term.name.toLowerCase())!, found.get(b.term.name.toLowerCase())!]
        ka.alternatives = [...new Set([...(ka.alternatives ?? []), kb.name])]
        kb.alternatives = [...new Set([...(kb.alternatives ?? []), ka.name])]
      }
    }
    if (level !== 'mentioned') {
      for (const k of unlistedNames(body)) {
        const known = [...found.values()].some((f) => has(k.name, f) || f.spellings.some((s) => mentions(s, k.name, true)))
        if (!known && !openers.has(k.name)) add({ ...k, level })
      }
    }
    if (YEARS.test(line) && !/years?\s+(of\s+age|old)/i.test(line) && (level !== 'mentioned' || /experience/i.test(line))) {
      const full = line.replace(/^[-•●◦▪▫■□·‣⁃▸►○–—*\s]+/, '').replace(/\*\*/g, '')
      const text = full.length > 160 ? `${full.slice(0, 157)}...` : full
      if (!years.includes(text)) years.push(text)
    }
  }

  const keywords = [...found.values()].sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level))
  return { keywords, years }
}

export function checkResume(keywords: Keyword[], resume: string): Array<Keyword & { found: boolean; via?: string }> {
  const text = normalize(resume)
  const byName = new Map(keywords.map((k) => [k.name, k]))
  return keywords.map((k) => {
    if (has(text, k)) return { ...k, found: true }
    const via = k.alternatives?.find((name) => {
      const alt = byName.get(name)
      return alt && has(text, alt)
    })
    return { ...k, found: !!via, via }
  })
}
