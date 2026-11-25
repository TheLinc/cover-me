// Mirrored byte-for-byte: extension/src/lib/ai/ats-score.ts ⇄ backend/supabase/functions/_shared/ats-score.ts.
// Scored here, not by the model, so it's deterministic (https://github.com/TheLinc/cover-me/commit/19482ab32c90e661ebfd9ca22cd04e6829aa0c6c).

export interface KeywordMatch {
  tier1Covered?: unknown
  tier1Missing?: unknown
  tier2Covered?: unknown
  tier2Missing?: unknown
  gatingGaps?: unknown
}

export interface ScoreContext {
  jobDescription?: string
  candidate?: string
}

const TIER1_WEIGHT = 70
const TIER2_WEIGHT = 30
const GATING_PENALTY = 10
// Capped so strong-skill candidates aren't cratered (https://github.com/TheLinc/cover-me/commit/19482ab32c90e661ebfd9ca22cd04e6829aa0c6c).
const MAX_GATING_PENALTY = 25

function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : []
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function mentions(text: string, term: string): boolean {
  return new RegExp(`(^|[^A-Za-z0-9])${escapeRe(term)}($|[^A-Za-z0-9])`, 'i').test(text)
}

// "Requires 5yr, candidate ~7yr", "Requires 5+ years, candidate ~3 years", "Requires 4yr, candidate ~2.5yr" (#278).
function yearsMet(gap: string): boolean {
  const m = /requires?\s*(\d+(?:\.\d+)?)\+?\s*(?:yrs?|years?)\b.*?candidate\s*~?\s*(\d+(?:\.\d+)?)\s*(?:yrs?|years?)/i.exec(gap)
  return !!m && Number(m[2]) >= Number(m[1])
}

// Up to two capitalized words, or one token like "SQL" or "C#" (https://github.com/TheLinc/cover-me/commit/19482ab32c90e661ebfd9ca22cd04e6829aa0c6c).
const OPTION = '[A-Z][\\w.+#-]*(?:\\s[A-Z][\\w.+#-]*)?'

function coveredByAlternative(keyword: string, ctx: ScoreContext): boolean {
  if (!ctx.jobDescription || !ctx.candidate) return false
  const k = escapeRe(keyword)
  const sep = '\\s*(?:/|\\bor\\b)\\s*'
  // Starting only where a word starts keeps this linear on a long capitalized run (#358).
  const patterns = [new RegExp(`${k}${sep}(${OPTION})`, 'gi'), new RegExp(`(?<![\\w.+#-])(${OPTION})${sep}${k}`, 'g')]
  for (const re of patterns) {
    for (const m of ctx.jobDescription.matchAll(re)) {
      const alt = m[1].trim().replace(/[.,;:]+$/, '')
      if (alt.toLowerCase() !== keyword.toLowerCase() && mentions(ctx.candidate, alt)) return true
    }
  }
  return false
}

export function scoreFromMatch(m: KeywordMatch, ctx: ScoreContext = {}): { score: number; gaps: string[]; requirements: string[] } {
  let t1c = strArr(m.tier1Covered).length
  let t2c = strArr(m.tier2Covered).length
  const t1Missing: string[] = []
  const t2Missing: string[] = []
  for (const k of strArr(m.tier1Missing)) coveredByAlternative(k, ctx) ? t1c++ : t1Missing.push(k)
  for (const k of strArr(m.tier2Missing)) coveredByAlternative(k, ctx) ? t2c++ : t2Missing.push(k)

  const missing = [...t1Missing, ...t2Missing]
  const gating = strArr(m.gatingGaps).filter((g) => !yearsMet(g))
  // A requirement already scored as a missing keyword isn't taken off twice (https://github.com/TheLinc/cover-me/commit/19482ab32c90e661ebfd9ca22cd04e6829aa0c6c).
  const penalized = gating.filter((g) => !missing.some((k) => mentions(g, k)))

  const t1total = t1c + t1Missing.length
  const t2total = t2c + t2Missing.length
  const t1frac = t1total ? t1c / t1total : 1
  const t2frac = t2total ? t2c / t2total : 1

  const base = TIER1_WEIGHT * t1frac + TIER2_WEIGHT * t2frac
  const penalty = Math.min(penalized.length * GATING_PENALTY, MAX_GATING_PENALTY)
  const score = Math.max(0, Math.min(100, Math.round(base - penalty)))
  const gaps = [...new Set([...missing, ...gating])]
  return { score, gaps, requirements: [...new Set(gating)] }
}

// The model names keywords as phrases ("Briefing senior leadership"), which an exact match would miss (#228).
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

export function scoreText(m: KeywordMatch, text: string, jobDescription?: string): { score: number; gaps: string[]; requirements: string[] } {
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

// Judging the original would take a second model call; one word-match measure for both keeps the gain honest (#228).
export function scoreBefore(m: KeywordMatch, atsScore: number, original: string, tailored: string, jobDescription?: string): number {
  const gain = scoreText(m, tailored, jobDescription).score - scoreText(m, original, jobDescription).score
  return Math.max(0, atsScore - Math.max(0, gain))
}
