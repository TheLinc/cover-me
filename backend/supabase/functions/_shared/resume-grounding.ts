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
//
// groundSkills runs first, on the model's skills list: every added or
// reworded skill must cite evidence copied from the resume, code checks the
// evidence is really there, and a small model confirms the evidence shows the
// skill (Zustand backs "State Management"; one gala doesn't back "annual fund
// campaigns").

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

const SKILL_STOP = new Set(['and', 'for', 'the', 'with'])

function tokens(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9+#]+/g) ?? []).filter((w) => w.length >= 2 && !SKILL_STOP.has(w))
}

/** An added skill backed only by a cited resume phrase, pending the pair check. */
export interface SkillClaim { skill: string; evidence: string }

/** Asks a small model a question and returns its text reply. Each caller supplies its own. */
export type AskModel = (prompt: string) => Promise<string>

// Examples deliberately come from fields the eval fixtures don't cover, so the
// check isn't tuned to its own test cases.
export function buildClaimCheckPrompt(claims: SkillClaim[]): string {
  const lines = claims.map((c, i) => `${i}. EVIDENCE: "${c.evidence}" → SKILL: "${c.skill}"`).join('\n')
  return `SKILL CLAIM CHECK. A resume-tailoring tool added skills to a candidate's skills list, each justified by a phrase taken from the candidate's resume. For each pair, decide whether the evidence on its own shows the candidate has the skill, as a fair category name, synonym, or the job posting's wording for the same thing.

Answer false when the skill adds scope, seniority, a domain, a responsibility, or a result the evidence does not show, or names a specific tool, certification, license, or method the evidence does not name. When unsure, answer false.

Examples:
- "PostgreSQL" → "Relational Databases": true (a category the tool belongs to)
- "Kubernetes deployments" → "Container Orchestration": true
- "PostgreSQL" → "Oracle Database": false (a different product)
- "Organized one charity 5K run" → "Event Program Management": false (one event is not a program)
- "Answered phones at a front desk" → "Call Center Operations": false (adds scope)
- "CPR certified" → "Emergency Medical Technician": false (a different credential)
- "Supported the audit team" → "Audit Leadership": false (adds seniority)

PAIRS:
${lines}

Return ONLY JSON: {"verdicts": [{"i": 0, "ok": true}, ...]} with one entry per pair.`
}

/** Pair index → approved. Anything missing or unparseable counts as rejected. */
export function parseClaimVerdicts(raw: string, count: number): boolean[] {
  const ok = new Array<boolean>(count).fill(false)
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end <= start) return ok
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as { verdicts?: Array<{ i?: unknown; ok?: unknown }> }
    for (const v of parsed.verdicts ?? []) {
      if (typeof v.i === 'number' && v.i >= 0 && v.i < count) ok[v.i] = v.ok === true
    }
  } catch {
    // Unparseable reply: every claim stays rejected.
  }
  return ok
}

/**
 * The tailor returns skills as [{ skill, evidence? }]. A skill survives when
 * it appears in the candidate's material verbatim or word for word (a reorder
 * or light rewording). Anything else is a claim: its evidence, a phrase the
 * model must copy from the resume, has to really be there, and then `ask`
 * (a small model) must agree the evidence shows the skill. "Zustand" backs
 * "State Management"; "annual fundraising gala" does not back "annual fund
 * campaigns". If the check can't run, claims are dropped: the resume stays
 * truthful and only the extra labels are lost. Without `ask` (legacy callers),
 * claims with real evidence are kept. A comma-separated string passes through.
 */
export async function groundSkills(skills: unknown, candidate: string, ask?: AskModel): Promise<{ skills?: string; dropped: string[] }> {
  if (typeof skills === 'string') return { skills, dropped: [] }
  if (!Array.isArray(skills)) return { dropped: [] }
  const flat = (s: string) => s.toLowerCase().replace(/[‐-―−]/g, '-').replace(/\s+/g, ' ').trim()
  const source = flat(candidate)
  const sourceWords = new Set(tokens(candidate))
  const items: Array<{ skill: string; claim?: SkillClaim }> = []
  const dropped: string[] = []
  for (const item of skills) {
    const rec = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
    const skill = (typeof item === 'string' ? item : typeof rec.skill === 'string' ? rec.skill : '').trim()
    const evidence = typeof rec.evidence === 'string' ? rec.evidence.trim() : ''
    if (!skill) continue
    const ownWords = tokens(skill)
    // mentions() first: a verbatim skill of any length ("R", "C") is backed.
    if (mentions(candidate, skill) || (ownWords.length > 0 && ownWords.every((w) => sourceWords.has(w)))) items.push({ skill })
    else if (flat(evidence).length >= 2 && source.includes(flat(evidence))) items.push({ skill, claim: { skill, evidence } })
    else dropped.push(`${skill} (no resume evidence)`)
  }

  const claims = items.filter((i) => i.claim).map((i) => i.claim!)
  let approved = new Array<boolean>(claims.length).fill(true)
  if (ask && claims.length) {
    try {
      approved = parseClaimVerdicts(await ask(buildClaimCheckPrompt(claims)), claims.length)
    } catch {
      approved = approved.map(() => false)
    }
  }
  const rejected = new Set(claims.filter((_, i) => !approved[i]).map((c) => c.skill))
  claims.filter((c) => rejected.has(c.skill)).forEach((c) => dropped.push(`${c.skill} (evidence "${c.evidence}" doesn't show it)`))
  const kept = items.filter((i) => !i.claim || !rejected.has(i.skill)).map((i) => i.skill)
  return { skills: kept.length ? kept.join(', ') : undefined, dropped }
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
