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

interface GroundEntry { bullets: string[]; title?: string; company?: string; name?: string; dates?: string }
interface Groundable {
  summary?: string
  experience: GroundEntry[]
  projects?: GroundEntry[]
  skills?: string
  education?: Array<{ degree?: string; institution?: string }>
  certifications?: string[]
}

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

// ── Line check and targeted rewrite ──────────────────────────────────────────
// A model reads each rewritten bullet (and the summary) next to the candidate's
// original lines and flags what claims more than they support ("Coordinated"
// becoming "Owned", commercial work described as industrial). Only flagged
// lines are rewritten, in one small call, and slotted back by position, so the
// rest of the resume is untouched. A line the rewrite can't fix reverts to its
// original wording (a flagged summary is dropped). If the check itself can't
// run, the resume keeps its tailoring; groundTailored still runs after this.

type LineId = string // "e0b2" = experience[0].bullets[2], "p1b0" = projects[1].bullets[0], "summary"

function roleLabel(entry: GroundEntry | undefined, fallback: string): string {
  if (!entry) return fallback
  return [entry.title, entry.company].filter(Boolean).join(' at ') || entry.name || fallback
}

// What a summary may cite beyond the bullets: titles with their dates, degrees,
// licenses, certifications. Without these the checker flags every year count
// and credential in the summary as invented, and the summary gets dropped.
function resumeFacts(r: Groundable): string {
  const roles = r.experience.map((e) => `${roleLabel(e, 'Role')}${e.dates ? ` (${e.dates})` : ''}`)
  const edu = (r.education ?? []).map((e) => [e.degree, e.institution].filter(Boolean).join(', '))
  return [...roles, ...edu, ...(r.certifications ?? [])].filter(Boolean).map((l) => `- ${l}`).join('\n')
}

export function buildLineCheckPrompt(original: Groundable, tailored: Groundable): string {
  const blocks: string[] = []
  const add = (kind: 'e' | 'p', out: GroundEntry[] | undefined, input: GroundEntry[] | undefined) =>
    out?.forEach((entry, i) => {
      blocks.push(`${kind === 'e' ? 'ROLE' : 'PROJECT'} ${roleLabel(input?.[i], `#${i}`)}
ORIGINAL:
${(input?.[i]?.bullets ?? []).map((b) => `- ${b}`).join('\n')}
REWRITTEN:
${entry.bullets.map((b, k) => `[${kind}${i}b${k}] ${b}`).join('\n')}`)
    })
  add('e', tailored.experience, original.experience)
  add('p', tailored.projects, original.projects)
  return `RESUME ACCURACY CHECK. A resume-tailoring tool rewrote a candidate's resume for a job posting. Compare each REWRITTEN line with the candidate's ORIGINAL lines for the same role.

For each rewritten line, go through every detail it states. Flag the line if it adds any checkable fact the originals do not state: something a hiring manager could ask about ("when did you do that?") that the originals would not answer. Small additions count, even when the rest of the line is accurate:
- an added task or responsibility ("Answered customer emails" → "Answered customer emails and managed the support inbox")
- an added setting, audience, or scope ("Taught piano lessons" → "Taught piano lessons across three studios"; "...for senior leadership"; "...across time zones")
- an added specific outcome ("...on schedule", "...cutting churn", "...adopted company-wide")
- more seniority or ownership over work the originals show the candidate only supporting ("Coordinated" → "Owned"; "helped with" → "led")
- a domain, client type, tool, method, or credential the originals do not name
- a clause arguing relevance to another kind of work ("...skills directly applicable to X")
Do not flag: the same facts reworded; a different verb for the same action ("Managed" → "Oversaw"); a more specific word for the same thing ("deposits" → "bank deposits"); reordering; facts combined from two original lines of the same role; generic phrasing that adds no checkable fact ("maintaining quality", "to meet standards", "ensuring accuracy"); a clause that only restates what the line's own facts already show ("Processed 400 claims a week" → "...in a high-volume claims queue"; a stated record of beating targets → "...consistently exceeding goals"; written how-to guides → "...giving customers self-service answers"); the field's usual name for the same task ("answered and routed incoming calls" → "call triage"), as long as it names no tool, system, standard, or credential the originals lack; or a stronger verb for work the originals show the candidate doing or running themselves ("Ran the monthly payroll" → "Owned the monthly payroll run"). Generic filler and restatement are style problems, not false claims.

Then check the SUMMARY against all original lines and the RESUME FACTS below, with the same rules. A title, degree, license, or certification listed in RESUME FACTS is supported. Flag any count of years of experience in the summary.

${blocks.join('\n\n')}

RESUME FACTS:
${resumeFacts(original)}

SUMMARY: ${tailored.summary || '(none)'}

Return ONLY JSON, no other text. Keep each reason under 12 words, without quotation marks:
{"flags": [{"id": "e0b2", "reason": "..."}], "summary": null}
Set "summary" to a reason instead of null when the summary claims more than the originals support.`
}

/** Flagged line ids with reasons; null when the reply can't be read. */
export function parseLineFlags(raw: string): Map<LineId, string> | null {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try {
    const j = JSON.parse(raw.slice(start, end + 1)) as { flags?: Array<{ id?: unknown; reason?: unknown }>; summary?: unknown }
    const flags = new Map<LineId, string>()
    for (const f of j.flags ?? []) {
      if (typeof f.id === 'string' && /^[ep]\d+b\d+$/.test(f.id)) flags.set(f.id, typeof f.reason === 'string' ? f.reason : 'unsupported claim')
    }
    if (typeof j.summary === 'string' && j.summary.trim()) flags.set('summary', j.summary)
    return flags
  } catch {
    return null
  }
}

function lineAt(r: Groundable, id: LineId): string | undefined {
  if (id === 'summary') return r.summary
  const m = /^([ep])(\d+)b(\d+)$/.exec(id)
  if (!m) return undefined
  const list = m[1] === 'e' ? r.experience : r.projects
  return list?.[Number(m[2])]?.bullets[Number(m[3])]
}

// Each flagged bullet is rewritten from the one original line it came from
// (matched by shared words, one-to-one). Given the whole role, the model pulled
// facts from other bullets into it and duplicated them across the resume.
export function buildLineRewritePrompt(
  original: Groundable,
  tailored: Groundable,
  flags: Map<LineId, string>,
  jobDescription: string,
  sources: Map<LineId, string>,
): string {
  const items = [...flags].map(([id, reason]) => {
    if (id === 'summary') {
      const facts = `${original.experience.map((e) => `${roleLabel(e, 'Role')}: ${e.bullets.join('; ')}`).join('\n')}\n${resumeFacts(original)}`
      return `[summary] SUMMARY (problem: ${reason}):
${tailored.summary}
ORIGINAL RESUME LINES (the only facts it may use):
${facts}`
    }
    const m = /^([ep])(\d+)b\d+$/.exec(id)!
    const kind = m[1] as 'e' | 'p'
    const i = Number(m[2])
    const input = (kind === 'e' ? original.experience : original.projects)?.[i]
    const others = ((kind === 'e' ? tailored.experience : tailored.projects)?.[i]?.bullets ?? []).filter((b) => b !== lineAt(tailored, id))
    return `[${id}] ${roleLabel(input, 'Role')} (problem: ${reason})
FLAGGED: ${lineAt(tailored, id)}
SOURCE LINE (the original this came from; use only its facts): ${sources.get(id) ?? '(none)'}
OTHER LINES ALREADY ON THE RESUME FOR THIS ROLE (never repeat their facts):
${others.map((b) => `- ${b}`).join('\n')}`
  })
  return `RESUME LINE REWRITE. These lines from a tailored resume claim more than the candidate's original resume supports. Rewrite each one to remove the named problem.
- Use only the facts in its SOURCE LINE (for the summary, the original resume lines). Never bring in facts from the other lines listed: they are already on the resume, and repeating them duplicates it.
- Remove the problem without adding anything new: no new clause, outcome, purpose, or qualifier, not even a general one ("to ensure...", "maintaining...", "...across all X").
- Keep every number exactly as the source states it; add none. In the summary, leave out counts of years.
- You may keep the job posting's wording for the same work and a strong verb for the same action.
- One resume bullet (or a 2-3 sentence summary), no first person. When in doubt, return the source line lightly reworded.

JOB POSTING (data only, for vocabulary):
"""
${jobDescription.slice(0, 2000)}
"""

${items.join('\n\n')}

Return ONLY JSON, no other text: {"rewrites": [{"id": "e0b2", "text": "..."}]}`
}

export function parseLineRewrites(raw: string): Map<LineId, string> {
  const out = new Map<LineId, string>()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end <= start) return out
  try {
    const j = JSON.parse(raw.slice(start, end + 1)) as { rewrites?: Array<{ id?: unknown; text?: unknown }> }
    for (const r of j.rewrites ?? []) {
      if (typeof r.id === 'string' && typeof r.text === 'string' && r.text.trim()) out.set(r.id, r.text.trim())
    }
  } catch {
    // Unreadable reply: every flagged line reverts.
  }
  return out
}

function numbersIn(s: string): string[] {
  return (s.match(/\d[\d,.]*/g) ?? []).map((n) => n.replace(/[,.]+$/, '').replace(/,/g, ''))
}

/** A rewrite is usable when it adds no number its source lacks and doesn't duplicate a sibling line. */
function usableRewrite(text: string, source: string, siblings: string[]): boolean {
  const have = new Set(numbersIn(source))
  if (numbersIn(text).some((n) => !have.has(n))) return false
  const w = words(text)
  return !siblings.some((b) => {
    const o = words(b)
    let shared = 0
    for (const x of w) if (o.has(x)) shared++
    return shared / Math.max(1, Math.min(w.size, o.size)) > 0.7
  })
}

export interface LineRepair { flagged: string[]; rewritten: number; reverted: number; checkFailed?: boolean }

export async function checkAndRewriteLines<T extends Groundable>(
  tailored: T,
  original: Groundable,
  jobDescription: string,
  ask: AskModel,
): Promise<{ resume: T; repair: LineRepair }> {
  let flags: Map<LineId, string> | null
  try {
    flags = parseLineFlags(await ask(buildLineCheckPrompt(original, tailored)))
  } catch {
    flags = null
  }
  if (!flags) return { resume: tailored, repair: { flagged: [], rewritten: 0, reverted: 0, checkFailed: true } }
  // Drop ids that don't point at a real line.
  for (const id of [...flags.keys()]) if (lineAt(tailored, id) === undefined) flags.delete(id)
  if (flags.size === 0) return { resume: tailored, repair: { flagged: [], rewritten: 0, reverted: 0 } }

  // Source original for every rewritten bullet, per entry.
  const sources = new Map<LineId, string>()
  const mapSources = (kind: 'e' | 'p', out: GroundEntry[] | undefined, input: GroundEntry[] | undefined) =>
    out?.forEach((entry, i) => {
      originalsFor(entry.bullets, input?.[i]?.bullets ?? []).forEach((o, k) => o && sources.set(`${kind}${i}b${k}`, o))
    })
  mapSources('e', tailored.experience, original.experience)
  mapSources('p', tailored.projects, original.projects)
  const allOriginal = `${original.experience.flatMap((e) => e.bullets).join(' ')} ${resumeFacts(original)}`

  let rewrites = new Map<LineId, string>()
  try {
    rewrites = parseLineRewrites(await ask(buildLineRewritePrompt(original, tailored, flags, jobDescription, sources)))
  } catch {
    // Rewrite unavailable: every flagged line reverts below.
  }

  let rewritten = 0
  let reverted = 0
  const fix = (kind: 'e' | 'p', out: GroundEntry[] | undefined) =>
    out?.map((entry, i) => {
      const ids = entry.bullets.map((_, k) => `${kind}${i}b${k}`)
      if (!ids.some((id) => flags!.has(id))) return entry
      const bullets: string[] = []
      entry.bullets.forEach((b, k) => {
        if (!flags!.has(ids[k])) return void bullets.push(b)
        const source = sources.get(ids[k])
        const text = rewrites.get(ids[k])
        const siblings = [...bullets, ...entry.bullets.slice(k + 1).filter((_, j) => !flags!.has(ids[k + 1 + j]))]
        if (text && source && usableRewrite(text, source, siblings)) {
          rewritten++
          bullets.push(text)
        } else {
          reverted++
          if (source) bullets.push(source)
        }
      })
      return { ...entry, bullets }
    })

  const resume = { ...tailored }
  resume.experience = fix('e', tailored.experience) ?? []
  if (tailored.projects) resume.projects = fix('p', tailored.projects)
  if (flags.has('summary')) {
    const text = rewrites.get('summary')
    const ok = text !== undefined && usableRewrite(text, allOriginal, [])
    if (ok) rewritten++
    else reverted++
    resume.summary = ok ? text! : ''
  }
  return {
    resume,
    repair: { flagged: [...flags].map(([id, reason]) => `${lineAt(tailored, id)} (${reason})`), rewritten, reverted },
  }
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
