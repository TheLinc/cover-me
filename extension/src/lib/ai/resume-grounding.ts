// Grounding guard for tailored resumes. Mirrored byte-for-byte:
//   extension/src/lib/ai/resume-grounding.ts ⇄ backend/supabase/functions/_shared/resume-grounding.ts
// scripts/check-prompt-sync.mjs fails the build if the copies drift.
//
// The tailor prompt forbids naming anything the candidate lacks, yet the model
// still copies job-posting requirements into the output ("ACLS" in a nurse's
// skills, "TIG (GTAW)" for a stick welder, "Hazmat Tanker Driver" for a tanker
// driver). This removes them in code, after the merge.
//
// A term is "job-only" when it looks like a named requirement (an acronym, a
// token mixing letters and digits, internal capitals like NetSuite, or a
// capitalized word mid-sentence) and appears in the job description but
// nowhere in the candidate's own material. Then:
//   skills   drop the parenthetical, or the whole item, that names it
//   summary  drop the sentence that names it
//   bullets  revert that bullet to the candidate's original wording
// Lowercase phrases ("food cost", "due diligence") are not detected; the
// prompt's integrity rules stay the first line of defence for those.

interface GroundEntry { bullets: string[] }
interface Groundable { summary?: string; experience: GroundEntry[]; projects?: GroundEntry[]; skills?: string }

// Capitalized tokens that name nothing a candidate could lack.
const GENERIC = new Set(['I', 'IT', 'HR', 'US', 'USA', 'UK', 'EU', 'OK', 'AM', 'PM', 'Inc', 'LLC', 'Ltd'])

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function mentions(text: string, term: string): boolean {
  return new RegExp(`(^|[^A-Za-z0-9])${escapeRe(term)}($|[^A-Za-z0-9])`, 'i').test(text)
}

/** Every string value in the candidate's resume (keys excluded), plus any supplemental context they verified. */
export function candidateText(resume: unknown, supplemental?: string): string {
  const out: string[] = supplemental ? [supplemental] : []
  const walk = (v: unknown): void => {
    if (typeof v === 'string') out.push(v)
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  walk(resume)
  return out.join('\n')
}

function grounded(token: string, candidate: string): boolean {
  if (mentions(candidate, token)) return true
  // "CDL-A" is grounded by "CDL"; "Allen-Bradley" and "3-way" are not.
  return token.includes('-') && token.split('-').some((p) => /[A-Za-z]{2,}/.test(p) && mentions(candidate, p))
}

export function jobOnlyTerms(jobDescription: string, candidate: string): string[] {
  const terms = new Set<string>()
  for (const line of jobDescription.split('\n')) {
    const re = /[A-Za-z0-9][A-Za-z0-9+#&.-]*[A-Za-z0-9+#]|[A-Za-z0-9]/g
    let m: RegExpExecArray | null
    while ((m = re.exec(line)) !== null) {
      const before = line.slice(0, m.index).trimEnd()
      const sentenceStart = before === '' || /[.!?:;•*–—-]$/.test(before)
      for (const tok of m[0].replace(/\.+$/, '').split('/')) {
        const acronym = tok.length >= 2 && /^[A-Z0-9&+#.-]+$/.test(tok) && /[A-Z]/.test(tok)
        const mixed = /\d/.test(tok) && /[A-Za-z]/.test(tok)
        const innerCaps = /^[A-Za-z]*[a-z][A-Z]/.test(tok)
        const properMid = /^[A-Z][a-z]/.test(tok) && !sentenceStart
        if (!(acronym || mixed || innerCaps || properMid) || GENERIC.has(tok)) continue
        if (!grounded(tok, candidate)) terms.add(tok)
      }
    }
  }
  return [...terms]
}

function splitSkills(skills: string): string[] {
  const items: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of skills) {
    if (ch === '(') depth++
    if (ch === ')') depth = Math.max(0, depth - 1)
    if (ch === ',' && depth === 0) {
      items.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  items.push(cur.trim())
  return items.filter(Boolean)
}

function words(s: string): Set<string> {
  return new Set(s.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])
}

// Pair each rewritten bullet with the original it most likely came from
// (greedy by shared words, one-to-one), so an offending rewrite can be undone.
function originalsFor(rewritten: string[], originals: string[]): Array<string | undefined> {
  const pairs: Array<[number, number, number]> = []
  rewritten.forEach((r, i) => {
    const rw = words(r)
    originals.forEach((o, j) => {
      let shared = 0
      for (const w of words(o)) if (rw.has(w)) shared++
      pairs.push([shared, i, j])
    })
  })
  pairs.sort((a, b) => b[0] - a[0])
  const out: Array<string | undefined> = new Array(rewritten.length)
  const usedR = new Set<number>()
  const usedO = new Set<number>()
  for (const [, i, j] of pairs) {
    if (usedR.has(i) || usedO.has(j)) continue
    out[i] = originals[j]
    usedR.add(i)
    usedO.add(j)
  }
  return out
}

export function groundTailored<T extends Groundable>(
  tailored: T,
  original: Groundable,
  candidate: string,
  jobDescription: string,
): { resume: T; removed: string[] } {
  const terms = jobOnlyTerms(jobDescription, candidate)
  const removed = new Set<string>()
  const hits = (text: string): string[] => {
    const found = terms.filter((t) => mentions(text, t))
    found.forEach((t) => removed.add(t))
    return found
  }
  if (terms.length === 0) return { resume: tailored, removed: [] }

  const fixEntries = (out: GroundEntry[] | undefined, input: GroundEntry[] | undefined) =>
    out?.map((entry, i) => {
      if (!entry.bullets.some((b) => terms.some((t) => mentions(b, t)))) return entry
      const origins = originalsFor(entry.bullets, input?.[i]?.bullets ?? [])
      const bullets = entry.bullets.flatMap((b, k) => (hits(b).length === 0 ? [b] : origins[k] ? [origins[k]!] : []))
      return { ...entry, bullets }
    })

  const resume = { ...tailored }
  if (tailored.summary) {
    resume.summary = tailored.summary
      .split(/(?<=[.!?])\s+/)
      .filter((sentence) => hits(sentence).length === 0)
      .join(' ')
  }
  resume.experience = fixEntries(tailored.experience, original.experience) ?? []
  if (tailored.projects) resume.projects = fixEntries(tailored.projects, original.projects)
  if (tailored.skills) {
    resume.skills = splitSkills(tailored.skills)
      .map((item) => {
        const cleaned = item.replace(/\s*\(([^()]*)\)/g, (group, inner: string) => (hits(inner).length ? '' : group)).trim()
        if (hits(cleaned).length === 0) return cleaned
        // "QuickBooks Online (QuickBooks)": keep the part the resume actually names.
        const inner = /\(([^()]*)\)/.exec(cleaned)?.[1].trim()
        return inner && mentions(candidate, inner) ? inner : ''
      })
      .filter(Boolean)
      .join(', ')
  }
  return { resume, removed: [...removed] }
}
