// Deterministic integrity checks for eval outputs. No AI involved: these are
// the mechanically-verifiable subset of the prompts' integrity rules.

import type { ParsedResume, TailoredResume } from '../src/types'
import type { EvalCase } from './fixtures'
import { lintLetter } from '../src/lib/ai/letter-lint'

export interface CheckResult {
  failures: string[]
  warnings: string[]
}

const RESUME_FILLER = [
  'leveraged', 'leveraging', 'utilized', 'utilizing', 'seamlessly', 'seamless',
  'cutting-edge', 'state-of-the-art', 'spearheaded', 'honed', 'fostered',
  'garnered', 'various', 'numerous',
]

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function containsTerm(text: string, term: string): boolean {
  if (term.includes(' ')) return text.toLowerCase().includes(term.toLowerCase())
  return new RegExp(`(^|[^A-Za-z])${escapeRegex(term)}($|[^A-Za-z])`, 'i').test(text)
}

/** Extract normalized numeric tokens: "60,000" → "60000", "$15K" → "15000". */
function extractNumbers(text: string): Array<{ raw: string; norm: string; hard: boolean }> {
  const out: Array<{ raw: string; norm: string; hard: boolean }> = []
  const re = /(\$?)(\d[\d,]*(?:\.\d+)?)\s?([KkMmBb](?![a-z]))?(%?)/g
  const MULT: Record<string, number> = { k: 1_000, m: 1_000_000, b: 1_000_000_000 }
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const base = m[2].replace(/,/g, '')
    const suffix = m[3]?.toLowerCase()
    const norm = suffix ? String(parseFloat(base) * MULT[suffix]) : base
    // "hard" numbers are the fabrication-risk class: money, percentages, and
    // anything 3+ digits. Bare 1–2 digit integers (years of experience, team
    // sizes) are often legitimately derived, so they only warn.
    const hard = m[1] === '$' || m[4] === '%' || norm.replace(/\./g, '').length >= 3
    out.push({ raw: `${m[1]}${m[2]}${m[3] ?? ''}${m[4]}`, norm, hard })
  }
  return out
}

function numberSourceSet(...sources: string[]): Set<string> {
  const set = new Set<string>()
  for (const s of sources) for (const n of extractNumbers(s)) set.add(n.norm)
  return set
}

/**
 * Every number in `text` must trace to the resume (hard rule). Numbers that
 * appear only in the JD downgrade to warnings — they can legitimately describe
 * the employer ("your 22-bed unit") or a JD term-of-art ("WCAG 2.1 AA").
 */
function checkNumberProvenance(
  label: string,
  text: string,
  resumeSource: Set<string>,
  jdSource: Set<string>,
  result: CheckResult,
): void {
  const seen = new Set<string>()
  for (const n of extractNumbers(text)) {
    if (resumeSource.has(n.norm) || seen.has(n.norm)) continue
    seen.add(n.norm)
    if (jdSource.has(n.norm)) {
      result.warnings.push(`${label}: number "${n.raw}" comes from the JD, not the resume — verify it describes the employer, not the candidate`)
    } else if (n.hard) {
      result.failures.push(`${label}: number "${n.raw}" appears in no input — invented metric`)
    } else {
      result.warnings.push(`${label}: small number "${n.raw}" not found in inputs — likely derived (years/count); verify`)
    }
  }
}

// ── Cover letter checks ──────────────────────────────────────────────────────

export function checkLetter(letter: string, c: EvalCase): CheckResult {
  const result: CheckResult = { failures: [], warnings: [] }

  const lint = lintLetter(letter, { companyName: c.job.company })
  for (const v of lint.violations) result.failures.push(`lint: ${v}`)

  for (const t of c.failTerms) {
    if (containsTerm(letter, t)) result.failures.push(`letter contains forbidden term "${t}" (not in resume)`)
  }
  for (const t of c.warnTerms) {
    if (containsTerm(letter, t)) result.warnings.push(`letter contains "${t}" — verify it describes the employer, not the candidate`)
  }

  const lastName = c.parsed.name.split(' ').pop() ?? c.parsed.name
  if (!letter.includes(lastName)) result.failures.push('letter does not end with the applicant name from the resume')

  checkNumberProvenance(
    'letter',
    letter,
    numberSourceSet(c.resumeText),
    numberSourceSet(c.job.description),
    result,
  )

  return result
}

// ── Tailored resume checks ───────────────────────────────────────────────────

export function checkTailored(out: TailoredResume, c: EvalCase): CheckResult {
  const result: CheckResult = { failures: [], warnings: [] }
  const input: ParsedResume = c.parsed

  const same = (label: string, a: string | undefined, b: string | undefined) => {
    if ((a ?? '').trim() !== (b ?? '').trim()) {
      result.failures.push(`${label} altered: "${a}" → "${b}"`)
    }
  }

  same('name', input.name, out.name)
  same('email', input.email, out.email)
  same('phone', input.phone, out.phone)

  // Experience: same entries, same order, same bullet counts (default mode).
  if (out.experience.length !== input.experience.length) {
    result.failures.push(`experience entry count changed: ${input.experience.length} → ${out.experience.length}`)
  } else {
    input.experience.forEach((inRole, i) => {
      const outRole = out.experience[i]
      same(`experience[${i}].title`, inRole.title, outRole.title)
      same(`experience[${i}].company`, inRole.company, outRole.company)
      same(`experience[${i}].dates`, inRole.dates, outRole.dates)
      if (outRole.bullets.length !== inRole.bullets.length) {
        result.failures.push(
          `experience[${i}] bullet count changed in default mode: ${inRole.bullets.length} → ${outRole.bullets.length}`,
        )
      }
    })
  }

  const inProjects = input.projects ?? []
  const outProjects = out.projects ?? []
  if (outProjects.length !== inProjects.length) {
    result.failures.push(`project count changed: ${inProjects.length} → ${outProjects.length}`)
  } else {
    inProjects.forEach((p, i) => {
      same(`projects[${i}].name`, p.name, outProjects[i]?.name)
      if (outProjects[i] && outProjects[i].bullets.length !== p.bullets.length) {
        result.failures.push(`projects[${i}] bullet count changed`)
      }
    })
  }

  if ((out.education?.length ?? 0) !== input.education.length) {
    result.failures.push('education entry count changed')
  } else {
    input.education.forEach((e, i) => {
      same(`education[${i}].institution`, e.institution, out.education[i]?.institution)
      same(`education[${i}].degree`, e.degree, out.education[i]?.degree)
    })
  }

  if (input.certifications?.length) {
    const outCerts = out.certifications ?? []
    for (const cert of input.certifications) {
      if (!outCerts.some((oc) => oc.trim() === cert.trim())) {
        result.failures.push(`certification dropped or altered: "${cert}"`)
      }
    }
  }

  // Content bans over the rewritten prose.
  const prose = [
    out.summary ?? '',
    ...out.experience.flatMap((r) => r.bullets),
    ...outProjects.flatMap((p) => p.bullets),
  ].join('\n')

  for (const t of c.failTerms) {
    if (containsTerm(prose, t) || (out.skills && containsTerm(out.skills, t))) {
      result.failures.push(`output contains forbidden term "${t}" (not in resume)`)
    }
  }
  for (const t of c.warnTerms) {
    if (containsTerm(prose, t)) result.warnings.push(`output contains "${t}" — verify context`)
  }
  for (const w of RESUME_FILLER) {
    if (containsTerm(prose, w)) result.failures.push(`output contains banned filler word "${w}"`)
  }

  // Skills list invariants.
  if (out.skills) {
    const skillItems = out.skills.split(',').map((s) => s.trim()).filter(Boolean)
    if (skillItems.length > 18) result.failures.push(`skills list has ${skillItems.length} items (hard cap 18)`)
    for (const k of c.mustKeepSkills) {
      // A kept skill may be rephrased ("patient education" → "patient and
      // family education"), so require all its words inside one skill item.
      const words = k.toLowerCase().split(/\s+/)
      const kept = containsTerm(out.skills, k) ||
        skillItems.some((item) => words.every((w) => item.toLowerCase().includes(w)))
      if (!kept) result.failures.push(`JD-named skill the candidate has was dropped from skills: "${k}"`)
    }
    // New skills the input never mentions anywhere: surface for review.
    const inputBlob = JSON.stringify(input).toLowerCase()
    for (const s of skillItems) {
      const base = s.replace(/\(.*\)/g, '').trim().toLowerCase()
      if (base && !inputBlob.includes(base)) {
        result.warnings.push(`skills gained "${s}" — allowed only as a category label backed by a named resume tool; verify`)
      }
    }
  }

  // Summary shape.
  if (out.summary) {
    const words = out.summary.split(/\s+/).filter(Boolean).length
    if (words < 25 || words > 85) result.warnings.push(`summary is ${words} words (target 40–70)`)
    if (/\b(I|my|me)\b/.test(out.summary)) result.failures.push('summary uses first-person pronouns')
  }

  checkNumberProvenance(
    'tailored resume',
    prose,
    numberSourceSet(JSON.stringify(input)),
    numberSourceSet(c.job.description),
    result,
  )

  if (typeof out.atsScore !== 'number') {
    result.failures.push('no atsScore computed — keywordMatch report missing from model output')
  }

  return result
}
