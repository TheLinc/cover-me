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
// A capitalized word ("Web") only counts when the output capitalizes it too.
// Lowercase phrases ("food cost", "due diligence") are not detected, nor is a
// product name copied in lowercase ("salesforce"); the prompt's integrity
// rules stay the first line of defence for those.
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

const INNER_CAPS = /^[A-Za-z]*[a-z][A-Z]/

// A plain capitalized term ("Web" in "Frontend Web Developer", "Rails") names
// the requirement only when the output capitalizes it too: lowercase "web" is
// an everyday word. Acronyms, tokens with digits and inner capitals (HIPAA,
// 401k, NetSuite) match in any case.
function namesTerm(text: string, term: string): boolean {
  if (!plainWord(term)) return mentions(text, term)
  const re = new RegExp(`(?:^|[^A-Za-z0-9])(${escapeRe(term)})(?=$|[^A-Za-z0-9])`, 'gi')
  return [...text.matchAll(re)].some((m) => m[1] !== m[1].toLowerCase())
}

function plainWord(term: string): boolean {
  return /^[A-Z][a-z]/.test(term) && !/\d/.test(term) && !INNER_CAPS.test(term)
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

/**
 * The candidate's note, plus the text of the version Regenerate starts from
 * when they edited it (#171): what they typed in the editor is theirs, like
 * the note. An unedited one is earlier model output, so it adds nothing. Its
 * gap lists name what the candidate lacks, so they never count.
 */
export function trustedNotes(supplemental: string | undefined, previous: unknown): string | undefined {
  const prev = editedVersion(previous)
  if (!prev) return supplemental
  const { atsGaps: _g, atsGapsBeforeEdits: _b, ...rest } = prev
  return [supplemental, candidateText(rest)].filter(Boolean).join('\n')
}

/**
 * Whether the version Regenerate starts from holds the candidate's own input:
 * they edited it (editedAt), or it was made with their note or regenerated from
 * one that holds it (hasEdits, set on the result so the trust carries to the
 * next Regenerate).
 */
export function buildsOnEdits(previous: unknown): boolean {
  return !!editedVersion(previous)
}

function editedVersion(previous: unknown): Record<string, unknown> | undefined {
  const prev = previous && typeof previous === 'object' ? (previous as Record<string, unknown>) : undefined
  return prev?.editedAt || prev?.hasEdits === true ? prev : undefined
}

// A resume's content, as opposed to scores and other metadata.
const CONTENT_KEYS = ['name', 'phone', 'email', 'website', 'links', 'location', 'summary', 'experience', 'projects', 'education', 'skills', 'certifications', 'otherSections']

/**
 * What Regenerate revises (#171): when the version the candidate saw holds
 * their edits, its content, so what they changed in the editor (a bullet added
 * or deleted, a title, a certification, a deleted section) carries over: the
 * merge builds on it, and the line check and grounding compare to it and
 * revert to it. Otherwise, or when it isn't shaped like a resume, the upload.
 * Roles line up by index (the editor can't add or remove one), so a version
 * whose roles or projects no longer match the upload's count (a different
 * resume uploaded since) falls back to the upload too; 0 is a deleted section.
 */
export function seenVersion<T extends Groundable>(upload: T, previous: unknown): T {
  const prev = editedVersion(previous)
  const fits = (list: unknown, own: GroundEntry[] | undefined) => !Array.isArray(list) || list.length === 0 || list.length === (own?.length ?? 0)
  if (!prev || !groundable(prev) || !fits(prev.experience, upload.experience) || !fits(prev.projects, upload.projects)) return upload
  const seen = { ...upload } as Record<string, unknown>
  for (const key of CONTENT_KEYS) {
    if (prev[key] === undefined) delete seen[key]
    else seen[key] = prev[key]
  }
  return seen as T
}

/**
 * After the merge on Regenerate from edits (#171), what it can't know about
 * the version the user saw: a role or project never comes back with more
 * bullets than they left it (trim and compact take any count; a deleted bullet
 * swapped in within the count is left to the line check, which compares to
 * the seen version), a summary they deleted stays deleted, and one they kept
 * stays when the run returns none.
 */
export function keepSeen<T extends Groundable>(merged: T, upload: Groundable, seen: Groundable): T {
  if (seen === upload) return merged
  const cap = (out: GroundEntry[] | undefined, own: GroundEntry[] | undefined) =>
    out?.map((e, i) => (own?.[i] && e.bullets.length > own[i].bullets.length ? { ...e, bullets: own[i].bullets } : e))
  const { summary, ...rest } = merged
  const kept = summary?.trim() ? summary : seen.summary
  return {
    ...rest,
    experience: cap(merged.experience, seen.experience) ?? [],
    ...(merged.projects && { projects: cap(merged.projects, seen.projects) }),
    ...(seen.summary !== undefined && { summary: kept }),
  } as unknown as T
}

// Shaped the way the checks read it: entries with string bullets, and a
// string summary and skills, string certifications and object education if any.
function groundable(r: Record<string, unknown>): boolean {
  const entries = (v: unknown) => Array.isArray(v) && v.every((e) => {
    const bullets = e && typeof e === 'object' ? (e as { bullets?: unknown }).bullets : undefined
    return Array.isArray(bullets) && bullets.every((b) => typeof b === 'string')
  })
  const optional = (v: unknown, ok: (v: unknown) => boolean) => v === undefined || ok(v)
  const text = (v: unknown) => typeof v === 'string'
  return entries(r.experience) && optional(r.projects, entries) && optional(r.summary, text) && optional(r.skills, text) &&
    optional(r.certifications, (v) => Array.isArray(v) && v.every(text)) &&
    optional(r.education, (v) => Array.isArray(v) && v.every((e) => !!e && typeof e === 'object'))
}

function grounded(token: string, candidate: string): boolean {
  if (mentions(candidate, token)) return true
  // "CDL-A" is grounded by "CDL"; "Allen-Bradley" and "3-way" are not.
  return token.includes('-') && token.split('-').some((p) => /[A-Za-z]{2,}/.test(p) && mentions(candidate, p))
}

export function jobOnlyTerms(jobDescription: string, candidate: string): string[] {
  const terms = new Set<string>()
  for (const line of jobDescription.split('\n')) {
    // An all-caps line ("SENIOR WEB DEVELOPER") makes every word look like an
    // acronym; its letter-only words are kept as plain words ("Web") instead.
    const shouted = !/[a-z]/.test(line) && (line.match(/[A-Za-z]{2,}/g)?.length ?? 0) >= 2
    const re = /[A-Za-z0-9][A-Za-z0-9+#&.-]*[A-Za-z0-9+#]|[A-Za-z0-9]/g
    let m: RegExpExecArray | null
    while ((m = re.exec(line)) !== null) {
      const before = line.slice(0, m.index).trimEnd()
      const sentenceStart = before === '' || /[.!?:;•*–—-]$/.test(before)
      for (const tok of m[0].replace(/\.+$/, '').split('/')) {
        const acronym = tok.length >= 2 && /^[A-Z0-9&+#.-]+$/.test(tok) && /[A-Z]/.test(tok)
        const mixed = /\d/.test(tok) && /[A-Za-z]/.test(tok)
        const innerCaps = INNER_CAPS.test(tok)
        const properMid = /^[A-Z][a-z]/.test(tok) && !sentenceStart
        if (!(acronym || mixed || innerCaps || properMid) || GENERIC.has(tok)) continue
        if (!grounded(tok, candidate)) terms.add(shouted && /^[A-Z]+$/.test(tok) ? tok[0] + tok.slice(1).toLowerCase() : tok)
      }
    }
  }
  // A plain word the posting also writes in lowercase ("Frontend Web Developer
  // ... build web apps") is an everyday word there, not a named requirement.
  // ponytail: "React" next to "react quickly" goes unchecked too; the line check covers it.
  return [...terms].filter((t) => !(plainWord(t) && new RegExp(`(^|[^A-Za-z0-9])${escapeRe(t.toLowerCase())}($|[^A-Za-z0-9])`).test(jobDescription)))
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

const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with'])

/**
 * Added skills in the casing of the resume's own skills list (#198): "Founder
 * Coaching" beside "Unit economics" becomes "Founder coaching". Items already
 * in the resume's list keep their casing. A word with a capital past its first
 * letter (SQL, PowerPoint, GitHub) or a dot (Node.js) is never touched, nor
 * is one the resume or posting capitalizes mid-sentence and never writes in
 * lowercase (the "Power" in "built dashboards in Power BI"), nor an item the
 * resume or posting writes exactly that way ("Google Analytics"). Neither is a
 * word written beside its neighbour as the resume or posting writes the pair
 * ("Power BI" in "Microsoft Power BI"), a lowercase name they never capitalize
 * ("dbt"), or anything in parentheses ("Data visualization (Tableau)").
 * ponytail: a name only ever at the start of a sentence reads as an ordinary
 * word; a list of known product names is the upgrade.
 */
export function matchSkillCase(skills: string | undefined, ownSkills: string | undefined, sources: string): string | undefined {
  if (!skills || !ownSkills) return skills
  const has = (re: string) => new RegExp(re).test(sources)
  const word = (w: string) => `${escapeRe(w)}(?![A-Za-z0-9])`
  // Capitalized after a lowercase word, a comma or a list marker: not a sentence start.
  const capMid = (w: string) => has(`(?:(?<![A-Za-z0-9])[a-z0-9]+ |[,;&/•*-] |\\()${word(w[0].toUpperCase() + w.slice(1).toLowerCase())}`)
  const keepsCase = (w: string): boolean => {
    if (w.length === 1 || /[\p{Lu}.]/u.test(w.slice(1))) return true
    return capMid(w) && !has(`(?<![A-Za-z0-9])${word(w.toLowerCase())}`)
  }
  const keepsLower = (w: string) => w === w.toLowerCase() && has(`(?<![A-Za-z0-9])${word(w)}`) && !has(`(?<![A-Za-z0-9])${word(w[0].toUpperCase() + w.slice(1))}`)
  const inSources = (s: string) => has(`(^|[^A-Za-z0-9])${escapeRe(s)}($|[^A-Za-z0-9])`)
  const inParens = (s: string) => s.split('(').length > s.split(')').length
  // Every word of an item with its position: first, small (and, of), or other.
  const wordsOf = (item: string) => [...item.matchAll(/\p{L}[\p{L}'.]*\p{L}|\p{L}/gu)].map((m, i) => ({ m, first: i === 0, small: i > 0 && SMALL_WORDS.has(m[0].toLowerCase()) }))
  // The resume's list may be split by bars, bullets or lines rather than commas.
  const own = ownSkills.split(/[|•·;\n]/).flatMap(splitSkills).filter(Boolean)
  // Words the resume's list writes past an item's start keep that casing even
  // where the posting uses them as plain words ("You will excel"). So does a
  // one-word item also capitalized mid-sentence ("Excel", "in Excel").
  const ownCased = new Set(own.flatMap((item) => {
    const ws = wordsOf(item).map((w) => w.m[0])
    return ws.length > 1 ? ws.slice(1) : ws.filter((w) => /^\p{Lu}/u.test(w) && capMid(w))
  }))
  let firstUp = 0, firstLow = 0, restUp = 0, restLow = 0
  for (const item of own) {
    for (const { m, first, small } of wordsOf(item)) {
      if (small || keepsCase(m[0])) continue
      const up = /^\p{Lu}/u.test(m[0])
      if (first) up ? firstUp++ : firstLow++
      else up ? restUp++ : restLow++
    }
  }
  const style = (up: number, low: number) => (up > low ? 'up' : low > up ? 'low' : undefined)
  const firstStyle = style(firstUp, firstLow)
  const restStyle = style(restUp, restLow)
  const recase = (w: string, to: 'up' | 'low' | undefined) => (to === 'up' ? w[0].toUpperCase() + w.slice(1) : to === 'low' ? w.toLowerCase() : w)
  return splitSkills(skills)
    .map((item) => {
      if (own.includes(item) || inSources(item)) return item
      const ws = wordsOf(item)
      const pairWritten = (a?: (typeof ws)[number], b?: (typeof ws)[number]) => !!a && !!b && inSources(item.slice(a.m.index, b.m.index! + b.m[0].length))
      let out = item
      ws.forEach(({ m, first, small }, k) => {
        if (small || ownCased.has(m[0]) || keepsCase(m[0]) || keepsLower(m[0]) || inParens(item.slice(0, m.index)) || pairWritten(ws[k - 1], ws[k]) || pairWritten(ws[k], ws[k + 1])) return
        out = out.slice(0, m.index) + recase(m[0], first ? firstStyle : restStyle) + out.slice(m.index! + m[0].length)
      })
      return out
    })
    .join(', ')
}

// One skill per item, splitting on commas outside parentheses ("Cloud (AWS, GCP)" stays whole).
export function splitSkills(skills: string): string[] {
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
// original wording (a flagged summary to the candidate's own, see below). If
// the check itself can't run, the resume keeps its tailoring; groundTailored
// still runs after this.

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

// Every line a summary may draw on: role and project bullets plus resumeFacts.
// The line check shows the model projects too, so the rewrite and its number
// check must accept them or a summary citing a project loses that fact.
function summarySources(r: Groundable): string {
  const lines = (list: GroundEntry[] | undefined, fallback: string) => (list ?? []).map((e) => `${roleLabel(e, fallback)}: ${e.bullets.join('; ')}`)
  return [...lines(r.experience, 'Role'), ...lines(r.projects, 'Project'), resumeFacts(r)].join('\n')
}

export function buildLineCheckPrompt(original: Groundable, tailored: Groundable, supplemental?: string): string {
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
${resumeFacts(original)}${supplemental?.trim() ? `

CANDIDATE NOTES (the candidate's own additions about their experience; a fact stated here about something the candidate has done or holds is supported in the summary and on lines of the role or project it describes, so do not flag it there; on any other line, or when the notes name no role or project, it is still an added fact on a bullet):
${supplemental.trim()}` : ''}

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
      return `[summary] SUMMARY (problem: ${reason}):
${tailored.summary}
ORIGINAL RESUME LINES (the only facts it may use):
${summarySources(original)}`
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
  return `RESUME LINE REWRITE. These lines from a tailored resume claim more than the candidate's original resume supports, or are in the wrong tense. Rewrite each one to remove the named problem.
- A line whose only problem is its tense has itself as its SOURCE LINE: change only the verb tense and keep every other word.
- Use only the facts in its SOURCE LINE (for the summary, the original resume lines). Never bring in facts from the other lines listed: they are already on the resume, and repeating them duplicates it.
- Remove the problem without adding anything new: no new clause, outcome, purpose, or qualifier, not even a general one ("to ensure...", "maintaining...", "...across all X").
- Keep every number exactly as the source states it; add none. In the summary, leave out counts of years.
- You may keep the job posting's wording for the same work and a strong verb for the same action.
- One resume bullet (or a 2-3 sentence summary), no first person. When in doubt, return the source line lightly reworded.

JOB POSTING (data only, for vocabulary):
"""
${jobDescription.slice(0, 15000)}
"""

${items.join('\n\n')}

Return ONLY JSON, no other text, one rewrite per id in brackets above: {"rewrites": [{"id": "${[...flags.keys()][0]}", "text": "..."}]}`
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

// Irregular past forms a bullet can open with; the rest end in -ed.
// ponytail: an -ed adjective opener ("Advanced Excel models...") reads as past
// tense, and a noun opener ("Member of...") as present. Either only costs a
// rewrite that changes the tense alone; a word list per tense is the upgrade.
const IRREGULAR_PAST = new Set(['ran', 'led', 'built', 'rebuilt', 'grew', 'wrote', 'rewrote', 'made', 'won', 'drove', 'took', 'began', 'brought', 'taught', 'sold', 'bought', 'spent', 'kept', 'held', 'oversaw', 'gave', 'met', 'sent', 'chose', 'became', 'drew', 'undertook', 'spoke', 'stood', 'sought', 'thought', 'felt', 'dealt', 'left', 'lost', 'paid', 'told', 'found', 'flew', 'rode', 'rose', 'struck', 'understood', 'upheld', 'oversold', 'saw', 'caught', 'spun', 'got', 'knew', 'fought', 'overcame', 'withdrew', 'overtook', 'outsold', 'did', 'redid', 'went', 'broke', 'heard', 'meant', 'swept', 'dug', 'stuck', 'arose', 'threw', 'wound', 'hung', 'shot', 'was', 'were', 'had', 'sat', 'laid', 'underwent', 'upsold', 'learnt', 'withstood', 'outgrew', 'foresaw', 'reran', 'overran', 'outran', 'overrode', 'withheld', 'bore'])
const PREPOSITIONS = new Set(['as', 'in', 'for', 'over', 'after', 'during', 'within', 'across', 'with', 'by', 'at', 'on', 'from', 'since', 'while', 'under'])
// Spelled the same in both tenses, or -ed words that aren't past forms: neither.
const EITHER_TENSE = new Set(['cut', 'set', 'put', 'hit', 'let', 'shut', 'spread', 'upset', 'quit', 'read', 'cost', 'beat', 'bid', 'broadcast', 'forecast', 'embed', 'shed', 'proofread', 'split', 'typeset', 'reset', 'offset', 'recast', 'reread'])
// An earlier role's dates end in a year ("2019 – 2022", "Mar 2020 - Jun 2022").
// Anything else ("– Present", "– Till date", "Since 2022", an open "2022 –")
// may be the current role, which is left alone.
const isEarlierRole = (dates: string) => /(19|20)\d\d\s*$/.test(dates) && !/\b(since|from)\b/i.test(dates)

/**
 * Present-tense bullets in an earlier role (#198), with the fix as the reason:
 * an earlier role whose bullets open with both past verbs (-ed or an irregular
 * past) and other words gets the others flagged toward past tense. The current
 * role is left alone, since it mixes on purpose: ongoing duties in present
 * tense, finished results in past. So are an earlier role with no past-tense
 * bullet at all and roles without dates.
 */
export function mixedTenseLines(r: Groundable): Map<LineId, string> {
  const flags = new Map<LineId, string>()
  r.experience.forEach((role, i) => {
    if (!role.dates || !isEarlierRole(role.dates.trim())) return
    const tenses = role.bullets.map((b) => {
      // The verb after a hyphen ("Co-led", "Cross-trained") or a leading adverb
      // ("Successfully migrated"). A prepositional opener ("In 2021, launched")
      // hides the verb, so it counts as neither.
      const word = /^\s*((?:[A-Za-z]+-)*)([A-Za-z]+)(\S*)(?:\s+([A-Za-z]+))?/.exec(b)
      let w = word?.[2].toLowerCase()
      if (w && /ly$/.test(w) && !word![1] && !word![3] && word![4]) w = word![4].toLowerCase()
      if (!w || word![3].startsWith(':') || /ing$/.test(w) || EITHER_TENSE.has(w) || (!word![1] && PREPOSITIONS.has(w))) return undefined
      return IRREGULAR_PAST.has(w) || (/[a-z]ed$/.test(w) && !/eed$/.test(w)) ? 'past' : 'other'
    })
    if (!tenses.includes('past')) return
    tenses.forEach((t, k) => {
      if (t === 'other') flags.set(`e${i}b${k}`, 'present tense in an earlier role: write it in past tense like its other lines, changing only the verb tense')
    })
  })
  return flags
}

export interface LineRepair {
  flagged: string[]
  rewritten: number
  reverted: number
  checkFailed?: boolean
  /** What a flagged summary became. */
  summary?: 'rewritten' | 'original' | 'trimmed' | 'emptied'
}

export async function checkAndRewriteLines<T extends Groundable>(
  tailored: T,
  original: Groundable,
  jobDescription: string,
  ask: AskModel,
  supplemental?: string,
): Promise<{ resume: T; repair: LineRepair }> {
  let flags: Map<LineId, string> | null
  try {
    flags = parseLineFlags(await ask(buildLineCheckPrompt(original, tailored, supplemental)))
  } catch {
    flags = null
  }
  if (!flags) return { resume: tailored, repair: { flagged: [], rewritten: 0, reverted: 0, checkFailed: true } }
  // Drop ids that don't point at a real line (an empty summary is none), and
  // lines word for word the same as one of their entry's originals (or the
  // original summary): they claim nothing new. On Regenerate the originals
  // include what the candidate typed in the editor (seenVersion).
  const unchanged = (id: LineId, line: string): boolean => {
    if (id === 'summary') return original.summary?.trim() === line
    const m = /^([ep])(\d+)b/.exec(id)
    return !!m && !!(m[1] === 'e' ? original.experience : original.projects)?.[Number(m[2])]?.bullets.some((b) => b.trim() === line)
  }
  for (const id of [...flags.keys()]) {
    const line = lineAt(tailored, id)?.trim()
    if (!line || unchanged(id, line)) flags.delete(id)
  }
  // Source original for every rewritten bullet, per entry.
  const sources = new Map<LineId, string>()
  const mapSources = (kind: 'e' | 'p', out: GroundEntry[] | undefined, input: GroundEntry[] | undefined) =>
    out?.forEach((entry, i) => {
      originalsFor(entry.bullets, input?.[i]?.bullets ?? []).forEach((o, k) => o && sources.set(`${kind}${i}b${k}`, o))
    })
  mapSources('e', tailored.experience, original.experience)
  mapSources('p', tailored.projects, original.projects)

  // Tense is checked in code, on unchanged lines too: the input can mix it.
  // A claim-flagged line is checked as its source too, since a failed rewrite
  // falls back to it: the rewrite then fixes the tense along with the claim.
  const claimFlags = new Set(flags.keys())
  const tense = mixedTenseLines(tailored)
  const asSource = { experience: tailored.experience.map((e, i) => ({ ...e, bullets: e.bullets.map((b, k) => (claimFlags.has(`e${i}b${k}`) && sources.get(`e${i}b${k}`)) || b) })) }
  for (const [id, reason] of mixedTenseLines(asSource)) if (claimFlags.has(id)) tense.set(id, reason)
  for (const [id, reason] of tense) flags.set(id, flags.has(id) ? `${flags.get(id)}; also ${reason}` : reason)
  const tenseOnly = (id: LineId) => tense.has(id) && !claimFlags.has(id)
  if (flags.size === 0) return { resume: tailored, repair: { flagged: [], rewritten: 0, reverted: 0 } }
  const allOriginal = summarySources(original)

  let rewrites = new Map<LineId, string>()
  try {
    // A tense-only line is its own source, so the rewrite keeps its tailoring.
    const promptSources = new Map(sources)
    for (const id of tense.keys()) if (tenseOnly(id)) promptSources.set(id, lineAt(tailored, id)!)
    rewrites = parseLineRewrites(await ask(buildLineRewritePrompt(original, tailored, flags, jobDescription, promptSources)))
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
        const allowed = tenseOnly(ids[k]) ? `${source ?? ''} ${b}` : source
        if (text && allowed && usableRewrite(text, allowed, siblings)) {
          rewritten++
          bullets.push(text)
        } else if (tenseOnly(ids[k])) {
          // The line claims nothing new; only its tense was off, so keep it.
          bullets.push(b)
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
  let summary: LineRepair['summary']
  if (flags.has('summary')) {
    const text = rewrites.get('summary') ?? ''
    if (text && usableRewrite(text, allOriginal, [])) {
      rewritten++
      summary = 'rewritten'
      resume.summary = text
    } else {
      // Like a bullet, revert to the candidate's own summary. With none, keep
      // the rewrite's sentences that pass; empty only when none do.
      reverted++
      const own = original.summary?.trim()
      const kept = text.split(/(?<=[.!?])\s+/).filter((s) => usableRewrite(s, allOriginal, [])).join(' ')
      resume.summary = own || kept
      summary = own ? 'original' : kept ? 'trimmed' : 'emptied'
    }
  }
  return {
    resume,
    repair: { flagged: [...flags].map(([id, reason]) => `${lineAt(tailored, id)} (${reason})`), rewritten, reverted, summary },
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
    const found = terms.filter((t) => namesTerm(text, t))
    found.forEach((t) => removed.add(t))
    return found
  }
  if (terms.length === 0) return { resume: tailored, removed: [] }

  const fixEntries = (out: GroundEntry[] | undefined, input: GroundEntry[] | undefined) =>
    out?.map((entry, i) => {
      if (!entry.bullets.some((b) => terms.some((t) => namesTerm(b, t)))) return entry
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
