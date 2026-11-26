// Deterministic integrity checks for eval outputs. No AI involved: these are
// the mechanically-verifiable subset of the prompts' integrity rules (https://github.com/TheLinc/cover-me/commit/46f809a1dc946cf6964c9e2ad9a400323d9bada5).

import type { ParsedResume, TailoredResume } from '../src/types'
import type { EvalCase } from './fixtures'
import { extractNumbers, lintLetter } from '../src/lib/ai/letter-lint'
import { MAX_GROUPED_SKILLS, mixedTenseLines, skillGroups, splitSkills } from '../src/lib/ai/resume-grounding'
import { shownInSection, urlCore } from '../src/lib/ai/resume-parse'
import { bulletBudget, isResultBullet } from '../src/lib/ai/resume-tailor'

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

function numberSourceSet(...sources: string[]): Set<string> {
  const set = new Set<string>()
  for (const s of sources) for (const n of extractNumbers(s)) set.add(n.norm)
  return set
}

/**
 * Every number in `text` must trace to the resume (hard rule). Numbers that
 * appear only in the JD downgrade to warnings — they can legitimately describe
 * the employer ("your 22-bed unit") or a JD term-of-art ("WCAG 2.1 AA") (https://github.com/TheLinc/cover-me/commit/46f809a1dc946cf6964c9e2ad9a400323d9bada5).
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

// ── Application answer checks (#232) ─────────────────────────────────────────

// A missing item the question asks about by name may appear only in a plain
// statement that the applicant lacks it ("I haven't used Kubernetes"); any
// other mention is a claim. Items the question doesn't name never appear (#232).
const NEGATION = /\b(not|never|no|without|lack\w*)\b|n['’]t\b/i

export function checkAnswer(answer: string, c: EvalCase, extra: { question?: string; failTerms?: string[]; maxLength?: number; maxWords?: number; uncut?: string; allowTerms?: string[]; allowNear?: string } = {}): CheckResult {
  const result: CheckResult = { failures: [], warnings: [] }
  if (!answer.trim()) {
    result.failures.push('empty answer')
    return result
  }
  // The posting's own title is fair to name, as in the letter check (#232).
  const prose = answer.replace(new RegExp(escapeRegex(c.job.title), 'gi'), ' ')
  const sentences = prose.split(/(?<=[.!?])\s+/)
  // A term the applicant's own change states may appear, but only as stated (#232).
  const allowed = new Set((extra.allowTerms ?? []).map((t) => t.toLowerCase()))
  for (const t of allowed) {
    const loose = sentences.filter((s) => containsTerm(s, t) && !NEGATION.test(s) && !(extra.allowNear && s.includes(extra.allowNear)))
    if (loose.length) result.failures.push(`answer claims "${t}" beyond what the change states: ${loose.join(' ')}`)
  }
  for (const t of [...c.failTerms, ...(extra.failTerms ?? [])].filter((t) => !allowed.has(t.toLowerCase()))) {
    const hits = sentences.filter((s) => containsTerm(s, t))
    if (!hits.length) continue
    const asked = !!extra.question && containsTerm(extra.question, t)
    if (!asked) result.failures.push(`answer names "${t}" (not in resume, and the question didn't ask)`)
    else if (!hits.every((s) => NEGATION.test(s))) result.failures.push(`answer claims "${t}" (not in resume)`)
    else result.warnings.push(`answer says the applicant lacks "${t}", as the question asked about it`)
  }
  for (const t of c.warnTerms) {
    if (containsTerm(prose, t)) result.warnings.push(`answer contains "${t}" — verify it describes the employer, not the candidate`)
  }
  // uncut: the reply before finishAnswer trimmed it to the box, which would hide an overrun (#232).
  const written = (extra.uncut ?? answer).length
  if (extra.maxLength && written > extra.maxLength) result.failures.push(`model wrote ${written} characters, over the box's ${extra.maxLength} (the end was cut)`)
  const words = answer.split(/\s+/).filter(Boolean).length
  if (extra.maxWords && words > extra.maxWords) result.failures.push(`answer is ${words} words, over the question's ${extra.maxWords}`)
  if (!extra.maxLength && !extra.maxWords && words > 230) result.warnings.push(`answer is ${words} words with no limit set (the prompt says about 200 at most)`)
  if (/^(dear|hi|hello)\b/i.test(answer.trim())) result.failures.push('answer opens with a greeting')
  if (/[*#]|^\s*[-•]\s/m.test(answer)) result.failures.push('answer contains markdown or bullets')
  checkNumberProvenance('answer', answer, numberSourceSet(c.resumeText), numberSourceSet(c.job.description), result)
  return result
}


// lintWarn: lint violations are warnings, for runs where the letter side
// didn't change (#243). Every other letter check still fails.
export function checkLetter(letter: string, c: EvalCase, lintWarn = false): CheckResult {
  const result: CheckResult = { failures: [], warnings: [] }

  // No numberSources: checkNumberProvenance below covers numbers, with the
  // JD-only and small-number warnings the lint doesn't give (#71). The resume sets
  // the length range, as in production.
  const lint = lintLetter(letter, { companyName: c.job.company, resumeText: c.resumeText })
  for (const v of lint.violations) (lintWarn ? result.warnings : result.failures).push(`lint: ${v}`)

  // The posting's own job title is fair to name ("the Hazmat Tanker Driver
  // role") even when a word in it is something the candidate lacks (#9).
  const titleRe = new RegExp(c.job.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
  // The salutation names no duty: "Dear Hiring Manager" isn't a hiring claim (#204).
  const prose = letter.replace(titleRe, ' ').replace(/\bhiring (?:manager|team)\b/gi, ' ')
  for (const t of c.failTerms) {
    if (containsTerm(prose, t)) result.failures.push(`letter contains forbidden term "${t}" (not in resume)`)
  }
  for (const [re, claim] of c.letterFailPatterns ?? []) {
    const hit = prose.match(re)
    if (hit) result.failures.push(`letter claims ${claim} the resume doesn't give: "${hit[0]}"`)
  }
  for (const t of c.warnTerms) {
    if (containsTerm(prose, t)) result.warnings.push(`letter contains "${t}" — verify it describes the employer, not the candidate`)
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


// `input` is the resume the tailor call actually received: the model's parse
// in the full pipeline, the fixture's answer key with --no-parse (https://github.com/TheLinc/cover-me/commit/cb47a02aefb4309f0fc6c8b28701bae612283d9f).
export function checkTailored(out: TailoredResume, c: EvalCase, input: ParsedResume = c.parsed): CheckResult {
  const result: CheckResult = { failures: [], warnings: [] }

  const same = (label: string, a: string | undefined, b: string | undefined) => {
    if ((a ?? '').trim() !== (b ?? '').trim()) {
      result.failures.push(`${label} altered: "${a}" → "${b}"`)
    }
  }

  const budget = c.mode === 'trim' ? bulletBudget(input) : undefined

  same('name', input.name, out.name)
  same('email', input.email, out.email)
  same('phone', input.phone, out.phone)

  // Bullet counts by mode (#251). Default: every role and project keeps its
  // exact count. Trim and compact drop whole bullets: never add one, never
  // empty an entry, compact caps roles at 3 and projects at 2, and trim must
  // actually cut an entry of 8 or more.
  const bulletCount = (label: string, inCount: number, outCount: number, cap: number) => {
    if (!c.mode) {
      if (outCount !== inCount) result.failures.push(`${label} bullet count changed in default mode: ${inCount} → ${outCount}`)
      return
    }
    if (outCount > inCount) result.failures.push(`${label} gained bullets in ${c.mode} mode: ${inCount} → ${outCount}`)
    if (outCount === 0) result.failures.push(`${label} lost every bullet in ${c.mode} mode`)
    if (c.mode === 'compact' && outCount > cap) result.failures.push(`${label} has ${outCount} bullets in compact mode (cap ${cap})`)
    if (c.mode === 'trim' && inCount >= 8 && outCount >= inCount) result.failures.push(`${label} kept all ${inCount} bullets in trim mode`)
  }

  // Experience: same entries, same order (#251).
  if (out.experience.length !== input.experience.length) {
    result.failures.push(`experience entry count changed: ${input.experience.length} → ${out.experience.length}`)
  } else {
    input.experience.forEach((inRole, i) => {
      const outRole = out.experience[i]
      same(`experience[${i}].title`, inRole.title, outRole.title)
      same(`experience[${i}].company`, inRole.company, outRole.company)
      same(`experience[${i}].dates`, inRole.dates, outRole.dates)
      bulletCount(`experience[${i}]`, inRole.bullets.length, outRole.bullets.length, 3)
      if (budget) {
        // Trim: within the role's budget, and a long master keeps its first measured results (#190).
        if (outRole.bullets.length > budget.experience[i]) {
          result.failures.push(`experience[${i}] kept ${outRole.bullets.length} bullets; trim budget is ${budget.experience[i]}`)
        }
        const kept = outRole.bullets.join('\n')
        for (const r of budget.long ? inRole.bullets.filter(isResultBullet).slice(0, Math.min(2, budget.experience[i])) : []) {
          const nums = r.match(/\d+(?:[./]\d+)*/g) ?? []
          if (!nums.every((n) => kept.includes(n))) result.failures.push(`experience[${i}] dropped a measured result: "${r.slice(0, 60)}…"`)
        }
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
      if (outProjects[i]) bulletCount(`projects[${i}]`, p.bullets.length, outProjects[i].bullets.length, 2)
      if (outProjects[i] && budget && outProjects[i].bullets.length > budget.projects[i]) {
        result.failures.push(`projects[${i}] kept ${outProjects[i].bullets.length} bullets; trim budget is ${budget.projects[i]}`)
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

  // Sections outside the six are never the model's to write (#54).
  if (JSON.stringify(out.otherSections ?? []) !== JSON.stringify(input.otherSections ?? [])) {
    result.failures.push('otherSections dropped or altered')
  }

  // Content bans over the rewritten prose (https://github.com/TheLinc/cover-me/commit/46f809a1dc946cf6964c9e2ad9a400323d9bada5).
  const prose = [
    out.summary ?? '',
    ...out.experience.flatMap((r) => r.bullets),
    ...outProjects.flatMap((p) => p.bullets),
  ].join('\n')

  for (const t of [...c.failTerms, ...(c.resumeFailTerms ?? [])]) {
    if (containsTerm(prose, t) || (out.skills && containsTerm(out.skills, t))) {
      result.failures.push(`output contains forbidden term "${t}" (not in resume)`)
    }
  }
  // Bullets only: the summary naming a term doesn't put back the bullet that proved it (#251).
  const bullets = [...out.experience, ...outProjects].flatMap((e) => e.bullets).join('\n')
  for (const t of c.keepInBullets ?? []) {
    if (!containsTerm(bullets, t)) result.failures.push(`bullet evidence of "${t}" was cut`)
  }
  for (const t of c.warnTerms) {
    if (containsTerm(prose, t)) result.warnings.push(`output contains "${t}" — verify context`)
  }
  for (const w of RESUME_FILLER) {
    if (containsTerm(prose, w)) result.failures.push(`output contains banned filler word "${w}"`)
  }

  // Skills list invariants (https://github.com/TheLinc/cover-me/commit/46f809a1dc946cf6964c9e2ad9a400323d9bada5).
  if (out.skills) {
    // A grouped list counts each group's items, its label and anything in
    // parentheses aside ("LLM APIs (OpenAI, Anthropic)" is one); any other list
    // counts every comma. Both are held to 18 in trim and compact mode (#190, #400).
    const grouped = skillGroups(input.skills).length > 0
    const skillItems = (grouped
      ? out.skills.split('\n').flatMap((line) => line.replace(/^[^:,]{2,48}:\s*/, '').replace(/\([^()]*\)/g, '').split(','))
      : out.skills.split(',')).map((s) => s.trim()).filter(Boolean)
    // Skills the posting names pass the cap only when they alone fill it (#190).
    const cap = Math.max(MAX_GROUPED_SKILLS, skillItems.filter((s) => containsTerm(c.job.description, s)).length)
    if (c.mode && skillItems.length > cap) result.failures.push(`skills list has ${skillItems.length} items (hard cap ${cap})`)
    // Default mode cuts no skill: the name and each term in its parentheses
    // keep all their words in some item, so "Oracle ERP (ERP)" keeps "Oracle ERP",
    // "Microsoft 365, Outlook" keeps "Microsoft 365 (Outlook)", and "Excel (pivot
    // tables)" doesn't keep "Excel (pivot tables, VLOOKUP)" (#400).
    if (!c.mode && input.skills) {
      const items = (list: string, seps: RegExp) => list.split(seps).flatMap((line) => splitSkills(line.replace(/^\s*[^:,]{2,48}:\s*/, '')))
      const words = (s: string) => s.toLowerCase().match(/[\p{L}\p{N}+#.]+/gu) ?? []
      const parts = (s: string) => [s.replace(/\([^()]*\)/g, ''), ...[...s.matchAll(/\(([^()]*)\)/g)].flatMap((m) => m[1].split(','))]
      const outWords = items(out.skills, /\n/).map((s) => new Set(words(s)))
      for (const own of items(input.skills, /[\n|•·;]/)) {
        if (!parts(own).every((p) => outWords.some((w) => words(p).every((x) => w.has(x))))) result.failures.push(`default mode dropped a resume skill: "${own}"`)
      }
    }
    for (const k of c.mustKeepSkills) {
      // A kept skill may be rephrased ("patient education" → "patient and
      // family education"), so require all its words inside one skill item (https://github.com/TheLinc/cover-me/commit/46f809a1dc946cf6964c9e2ad9a400323d9bada5).
      const words = k.toLowerCase().split(/\s+/)
      const kept = containsTerm(out.skills, k) ||
        skillItems.some((item) => words.every((w) => item.toLowerCase().includes(w)))
      if (!kept) result.failures.push(`JD-named skill the candidate has was dropped from skills: "${k}"`)
    }
    // New skills the input never mentions anywhere: surface for review (https://github.com/TheLinc/cover-me/commit/46f809a1dc946cf6964c9e2ad9a400323d9bada5).
    const inputBlob = JSON.stringify(input).toLowerCase()
    for (const s of skillItems) {
      const base = s.replace(/\(.*\)/g, '').trim().toLowerCase()
      if (base && !inputBlob.includes(base)) {
        result.warnings.push(`skills gained "${s}" — allowed only as a category label backed by a named resume tool; verify`)
      }
    }
  }

  // One tense per earlier role: the line check fixes mixed roles, so any left
  // are misses, or a noun opener ("Member of...") the heuristic reads as present (#198).
  for (const [id] of mixedTenseLines(out)) {
    const [, role, bullet] = /^e(\d+)b(\d+)$/.exec(id)!
    result.warnings.push(`experience[${role}] mixes tenses: "${out.experience[+role].bullets[+bullet]}"`)
  }

  // Summary shape (https://github.com/TheLinc/cover-me/commit/46f809a1dc946cf6964c9e2ad9a400323d9bada5).
  if (out.summary) {
    const words = out.summary.split(/\s+/).filter(Boolean).length
    if (words < 25 || words > 85) result.warnings.push(`summary is ${words} words (target 40–70)`)
    // A bare "I" would flag job titles like "Scientist I"; require it to act as a subject (https://github.com/TheLinc/cover-me/commit/cb47a02aefb4309f0fc6c8b28701bae612283d9f).
    if (/\b(my|me|myself)\b/i.test(out.summary) || /(^|[.!?]\s+)I\b|\bI (am|have|was|will|led|built|managed|bring)\b/.test(out.summary)) {
      result.failures.push('summary uses first-person pronouns')
    }
  }
  if (c.summaryTitle && !containsTerm(out.summary ?? '', c.summaryTitle)) {
    result.failures.push(`summary doesn't use the posting's title "${c.summaryTitle}"`)
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

// The parse step (raw text → structured JSON) runs before every hosted tailor.
// Compare it to the case's answer key. Formatting noise (dash style, spacing,
// bullet markers, curly quotes) is normalized away; wording is not (https://github.com/TheLinc/cover-me/commit/cb47a02aefb4309f0fc6c8b28701bae612283d9f).

function norm(s: string | undefined): string {
  return (s ?? '')
    .normalize('NFKC')
    .replace(/[‐-―−]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/^\s*[-•*·]\s+/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function checkParse(actual: ParsedResume, c: EvalCase): CheckResult {
  const result: CheckResult = { failures: [], warnings: [] }
  const want = c.parsed
  const eq = (label: string, a: string | undefined, b: string | undefined) => {
    if (norm(a) !== norm(b)) result.failures.push(`${label}: expected "${a}", parsed "${b}"`)
  }

  // Names may legitimately keep a credential suffix ("Jordan Bell, RN") (https://github.com/TheLinc/cover-me/commit/cb47a02aefb4309f0fc6c8b28701bae612283d9f).
  if (!norm(actual.name).includes(norm(want.name))) result.failures.push(`name: expected "${want.name}", parsed "${actual.name}"`)
  eq('email', want.email, actual.email)
  eq('phone', want.phone, actual.phone)

  if (actual.experience.length !== want.experience.length) {
    result.failures.push(`experience entries: expected ${want.experience.length}, parsed ${actual.experience.length}`)
  } else {
    want.experience.forEach((w, i) => {
      const a = actual.experience[i]
      eq(`experience[${i}].title`, w.title, a.title)
      eq(`experience[${i}].company`, w.company, a.company)
      eq(`experience[${i}].dates`, w.dates, a.dates)
      if (a.bullets.length !== w.bullets.length) {
        result.failures.push(`experience[${i}] bullets: expected ${w.bullets.length}, parsed ${a.bullets.length}`)
      } else {
        w.bullets.forEach((b, j) => eq(`experience[${i}].bullets[${j}]`, b, a.bullets[j]))
      }
    })
  }

  const wantProjects = want.projects ?? []
  const gotProjects = actual.projects ?? []
  if (gotProjects.length !== wantProjects.length) {
    result.failures.push(`projects: expected ${wantProjects.length}, parsed ${gotProjects.length}`)
  } else {
    wantProjects.forEach((p, i) => {
      if (!norm(gotProjects[i].name).includes(norm(p.name))) result.failures.push(`projects[${i}].name: expected "${p.name}", parsed "${gotProjects[i].name}"`)
      if (gotProjects[i].bullets.length !== p.bullets.length) result.failures.push(`projects[${i}] bullets: expected ${p.bullets.length}, parsed ${gotProjects[i].bullets.length}`)
    })
  }

  if (actual.education.length !== want.education.length) {
    result.failures.push(`education entries: expected ${want.education.length}, parsed ${actual.education.length}`)
  } else {
    want.education.forEach((w, i) => {
      eq(`education[${i}].degree`, w.degree, actual.education[i].degree)
      eq(`education[${i}].institution`, w.institution, actual.education[i].institution)
    })
  }

  const wantCerts = (want.certifications ?? []).map(norm)
  const gotCerts = (actual.certifications ?? []).map(norm)
  for (const cert of wantCerts) {
    if (!gotCerts.includes(cert)) result.failures.push(`certification missing or altered: "${cert}"`)
  }
  if (gotCerts.length > wantCerts.length) result.failures.push(`certifications: expected ${wantCerts.length}, parsed ${gotCerts.length}`)

  if (!!want.skills !== !!actual.skills) {
    result.failures.push(`skills section: expected ${want.skills ? 'present' : 'absent'}, parsed ${actual.skills ? 'present' : 'absent'}`)
  } else if (want.skills) {
    eq('skills', want.skills, actual.skills)
  }

  // Sections outside the six come through whole, and nothing else lands there
  // (a profile or a job section leaking in fails here) (#54).
  const wantOther = want.otherSections ?? []
  const gotOther = actual.otherSections ?? []
  if (gotOther.length !== wantOther.length) {
    result.failures.push(`otherSections: expected [${wantOther.map((o) => o.heading).join(', ')}], parsed [${gotOther.map((o) => o.heading).join(', ')}]`)
  } else {
    wantOther.forEach((w, i) => {
      eq(`otherSections[${i}].heading`, w.heading, gotOther[i].heading)
      if (gotOther[i].lines.length !== w.lines.length) {
        result.failures.push(`otherSections[${i}] lines: expected ${w.lines.length}, parsed ${gotOther[i].lines.length}`)
      } else {
        w.lines.forEach((l, j) => eq(`otherSections[${i}].lines[${j}]`, l, gotOther[i].lines[j]))
      }
    })
  }

  // The sections in the resume's order, where the answer key gives one (#165).
  if (want.sectionOrder) eq('sectionOrder', want.sectionOrder.join(', '), (actual.sectionOrder ?? []).join(', '))

  result.failures.push(...checkParseUrls(actual, c.resumeText))

  return result
}

// Every URL the resume text shows (#236): one with a protocol or www., or a
// domain under a common TLD (so not Node.js or a file name), without an
// email's domain or a sentence's last full stop.
const URL_RE = /(?<![\w@./-])(?:https?:\/\/|www\.|[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|org|net|io|dev|app|ai|co|me|ca|us|uk|edu|gov|info|xyz|tech|site|design|page|so|ly|fr|de)\b)[^\s)\]>,;"]*/gi
export function resumeUrls(text: string): string[] {
  return [...new Set((text.match(URL_RE) ?? []).filter((u) => !u.includes('@')).map((u) => u.replace(/\.+$/, '')))]
}

// A parse's URL failures (#236): a URL of the resume text found nowhere in the
// parse, or a URL on the contact line that the parse also puts in a section or
// the text first shows in one (shownInSection, without withLinks' rule that
// keeps one no entry holds rather than lose it).
export function checkParseUrls(actual: ParsedResume, resumeText: string): string[] {
  const parse = JSON.stringify(actual).toLowerCase()
  const { name, email, phone, location, website, links, ...sections } = actual
  const sectionUrls = new Set(resumeUrls(JSON.stringify(sections)).map(urlCore))
  const inSection = (l: string) => sectionUrls.has(urlCore(l)) || shownInSection(actual, resumeText, l)
  return [
    ...resumeUrls(resumeText).filter((u) => !parse.includes(urlCore(u))).map((u) => `URL missing from the parse: "${u}"`),
    ...(links ?? []).filter(inSection).map((l) => `section URL on the contact line: "${l}"`),
  ]
}

// Static sanity check on the fixtures themselves: every answer-key bullet must
// appear in the resume text the parser sees, or a parse "failure" is our bug (https://github.com/TheLinc/cover-me/commit/cb47a02aefb4309f0fc6c8b28701bae612283d9f).
export function checkFixture(c: EvalCase): CheckResult {
  const result: CheckResult = { failures: [], warnings: [] }
  const text = norm(c.resumeText.split(/\r?\n/).map(norm).join(' '))
  const all = [
    c.parsed.name,
    ...c.parsed.experience.flatMap((e) => [e.title, e.company, e.dates, ...e.bullets]),
    ...(c.parsed.projects ?? []).flatMap((p) => p.bullets),
    ...c.parsed.education.flatMap((e) => [e.degree, e.institution, ...e.bullets]),
    ...(c.parsed.certifications ?? []),
    c.parsed.skills ?? '',
    ...(c.parsed.otherSections ?? []).flatMap((o) => [o.heading, ...o.lines]),
  ].filter(Boolean)
  for (const item of all) {
    if (!text.includes(norm(item))) result.failures.push(`answer key text not found in resumeText: "${item.slice(0, 60)}"`)
  }
  if (!c.fieldNotes) result.failures.push('fieldNotes missing')
  return result
}
