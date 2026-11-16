// ATS match score. Mirrored byte-for-byte:
//   extension/src/lib/ai/ats-score.ts ⇄ backend/supabase/functions/_shared/ats-score.ts
// scripts/check-prompt-sync.mjs fails the build if the copies drift.
//
// The model reports which of the posting's keywords the tailored resume covers;
// the score is computed here, so it is deterministic and can only rise as
// keywords are covered over a fixed posting. Three corrections to the model's
// report, because each cost honest candidates points:
//   - a hard requirement already counted as a missing keyword isn't subtracted
//     a second time as a gating gap;
//   - a years requirement the candidate meets ("Requires 5yr, candidate ~7yr")
//     is not a gap;
//   - an either/or requirement ("Tableau or Power BI", "Westlaw/Lexis") counts
//     as covered when the resume has the other option.

export interface KeywordMatch {
  tier1Covered?: unknown
  tier1Missing?: unknown
  tier2Covered?: unknown
  tier2Missing?: unknown
  gatingGaps?: unknown
}

export interface ScoreContext {
  /** The job posting, for either/or requirements. */
  jobDescription?: string
  /** All of the candidate's own text (resume plus verified supplemental context). */
  candidate?: string
}

const TIER1_WEIGHT = 70
const TIER2_WEIGHT = 30
const GATING_PENALTY = 10 // per unmet hard qualification
const MAX_GATING_PENALTY = 25 // cap so strong-skill candidates aren't cratered

function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : []
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function mentions(text: string, term: string): boolean {
  return new RegExp(`(^|[^A-Za-z0-9])${escapeRe(term)}($|[^A-Za-z0-9])`, 'i').test(text)
}

// "Requires 5yr, candidate ~7yr", "Requires 5+ years, candidate ~3 years".
function yearsMet(gap: string): boolean {
  const m = /requires?\s*(\d+)\+?\s*(?:yrs?|years?)\b.*?candidate\s*~?\s*(\d+)\s*(?:yrs?|years?)/i.exec(gap)
  return !!m && Number(m[2]) >= Number(m[1])
}

// Up to two capitalized words, or one token like "SQL" or "C#".
const OPTION = '[A-Z][\\w.+#-]*(?:\\s[A-Z][\\w.+#-]*)?'

/** True when the posting offers `keyword` as one of several options and the candidate has another. */
function coveredByAlternative(keyword: string, ctx: ScoreContext): boolean {
  if (!ctx.jobDescription || !ctx.candidate) return false
  const k = escapeRe(keyword)
  const sep = '\\s*(?:/|\\bor\\b)\\s*'
  const patterns = [new RegExp(`${k}${sep}(${OPTION})`, 'gi'), new RegExp(`(${OPTION})${sep}${k}`, 'g')]
  for (const re of patterns) {
    for (const m of ctx.jobDescription.matchAll(re)) {
      const alt = m[1].trim().replace(/[.,;:]+$/, '')
      if (alt.toLowerCase() !== keyword.toLowerCase() && mentions(ctx.candidate, alt)) return true
    }
  }
  return false
}

// Coverage → score + complete gap list. A posting with no Tier-N keywords scores
// that tier as fully covered (nothing to miss) rather than dividing by zero.
export function scoreFromMatch(m: KeywordMatch, ctx: ScoreContext = {}): { score: number; gaps: string[] } {
  let t1c = strArr(m.tier1Covered).length
  let t2c = strArr(m.tier2Covered).length
  const t1Missing: string[] = []
  const t2Missing: string[] = []
  for (const k of strArr(m.tier1Missing)) coveredByAlternative(k, ctx) ? t1c++ : t1Missing.push(k)
  for (const k of strArr(m.tier2Missing)) coveredByAlternative(k, ctx) ? t2c++ : t2Missing.push(k)

  const missing = [...t1Missing, ...t2Missing]
  const gating = strArr(m.gatingGaps).filter((g) => !yearsMet(g))
  const penalized = gating.filter((g) => !missing.some((k) => mentions(g, k)))

  const t1total = t1c + t1Missing.length
  const t2total = t2c + t2Missing.length
  const t1frac = t1total ? t1c / t1total : 1
  const t2frac = t2total ? t2c / t2total : 1

  const base = TIER1_WEIGHT * t1frac + TIER2_WEIGHT * t2frac
  const penalty = Math.min(penalized.length * GATING_PENALTY, MAX_GATING_PENALTY)
  const score = Math.max(0, Math.min(100, Math.round(base - penalty)))
  const gaps = [...new Set([...missing, ...gating])]
  return { score, gaps }
}

// The same posting keywords, checked against `text` by word instead of by the
// model's judgment (#228). The model names keywords as phrases ("Briefing
// senior leadership", "SolidWorks (Creo or SolidWorks)"), so an exact match
// would miss most of them; a keyword counts when every word of it, or of one
// option it gives in parentheses or after a slash, appears in some form.
// Gating gaps carry over: tailoring can't meet a hard requirement.
const FILLER = new Set(['a', 'an', 'and', 'or', 'of', 'the', 'in', 'on', 'to', 'for', 'with', 'year', 'years', 'experience'])
const words = (s: string) => s.split(/[^A-Za-z0-9+#]+/).filter(Boolean)
// ponytail: 5-letter prefix as the stem ("managed" ~ "management"); a real stemmer if it misfires.
const stem = (w: string) => w.toLowerCase().slice(0, 5)

function options(keyword: string): string[] {
  const out = [keyword]
  const m = /^(.*?)\s*\((.*)\)\s*$/.exec(keyword)
  if (m) out.push(m[1], ...m[2].split(/,|\bor\b/))
  for (const o of [...out]) if (o.includes('/')) out.push(...o.split('/'))
  return out
}

function hasKeyword(stems: Set<string>, keyword: string): boolean {
  return options(keyword).some((o) => {
    const need = words(o).filter((w) => !FILLER.has(w.toLowerCase()) && !/^\d+\+?$/.test(w))
    return need.length > 0 && need.every((w) => stems.has(stem(w)))
  })
}

export function scoreText(m: KeywordMatch, text: string, jobDescription?: string): { score: number; gaps: string[] } {
  const stems = new Set(words(text).map(stem))
  const split = (keywords: string[]) => ({
    covered: keywords.filter((k) => hasKeyword(stems, k)),
    missing: keywords.filter((k) => !hasKeyword(stems, k)),
  })
  const t1 = split([...strArr(m.tier1Covered), ...strArr(m.tier1Missing)])
  const t2 = split([...strArr(m.tier2Covered), ...strArr(m.tier2Missing)])
  return scoreFromMatch(
    { tier1Covered: t1.covered, tier1Missing: t1.missing, tier2Covered: t2.covered, tier2Missing: t2.missing, gatingGaps: m.gatingGaps },
    { jobDescription, candidate: text },
  )
}

// The original resume's score, on the tailored score's scale: the tailored
// score less what tailoring's wording gained by word match. The model's own
// judgment of the original would need a second call; comparing the two
// resumes by one measure keeps the gain honest.
export function scoreBefore(m: KeywordMatch, atsScore: number, original: string, tailored: string, jobDescription?: string): number {
  const gain = scoreText(m, tailored, jobDescription).score - scoreText(m, original, jobDescription).score
  return Math.max(0, atsScore - Math.max(0, gain))
}
