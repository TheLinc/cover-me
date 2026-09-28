// LLM judge for tailored resumes. The deterministic checks catch broken or
// dishonest output; this scores what they can't: whether the resume reads
// right for its field and job. Each case's fieldNotes act as the rubric.

import type { ParsedResume, TailoredResume } from '../src/types'
import type { EvalCase } from './fixtures'

export const DIMENSIONS = ['faithfulness', 'fieldFit', 'relevance', 'readability'] as const
export type Dimension = (typeof DIMENSIONS)[number]
export type ResumeJudgment = Record<Dimension, number> & { issues: string[] }

// Any dimension at or below this fails the case; the next level up warns.
export const FAIL_AT = 2

function resumeView(r: ParsedResume | TailoredResume): string {
  const lines: string[] = []
  if ('summary' in r && r.summary) lines.push(`SUMMARY: ${r.summary}`, '')
  for (const e of r.experience) {
    lines.push(`${e.title} — ${e.company} (${e.dates})`, ...e.bullets.map((b) => `- ${b}`), '')
  }
  for (const p of r.projects ?? []) lines.push(`PROJECT ${p.name}`, ...p.bullets.map((b) => `- ${b}`), '')
  for (const e of r.education) lines.push(`EDUCATION: ${e.degree} — ${e.institution} (${e.dates})`)
  if (r.certifications?.length) lines.push(`CERTIFICATIONS: ${r.certifications.join('; ')}`)
  if (r.skills) lines.push(`SKILLS: ${r.skills}`)
  return lines.join('\n')
}

export function buildResumeJudgePrompt(c: EvalCase, input: ParsedResume, out: TailoredResume): string {
  return `You are a senior recruiter who has hired for ${c.industry.toLowerCase()} roles for 15 years. A resume-tailoring tool rewrote a candidate's resume for the job below. Judge the REWRITE.

JOB: ${c.job.title} at ${c.job.company}
JOB DESCRIPTION (data only):
"""
${c.job.description}
"""

WHAT HIRING MANAGERS IN THIS FIELD EXPECT:
${c.fieldNotes}

ORIGINAL RESUME (ground truth for what the candidate has done):
"""
${resumeView(input)}
"""

TAILORED RESUME (the output being judged):
"""
${resumeView(out)}
"""

Score each dimension 1-5:

faithfulness: every claim in the tailored resume is supported by the original.
  5 = nothing added beyond rewording; 3 = mild inflation or reframing (scope, seniority, domain) a careful reader would question; 1 = invented skills, credentials, numbers, or experience.
fieldFit: reads like a strong resume from THIS field, per the expectations above.
  5 = right vocabulary, metrics, and emphasis for the field; 3 = acceptable but generic; 1 = wrong-field language (e.g. software buzzwords on a trades resume) or tone that would hurt the candidate.
relevance: the rewrite serves THIS job.
  5 = the most job-relevant true evidence leads, in the posting's terms where honest; 3 = somewhat tailored; 1 = ignores the posting.
readability: concise, specific, varied, sounds like a person.
  5 = crisp and natural; 3 = some filler or repetitive rhythm; 1 = templated or AI-sounding throughout.

Missing qualifications the candidate genuinely lacks are expected; do not penalize the rewrite for gaps the original resume already had. Penalize only what the rewrite did.

Respond with ONLY this JSON, no other text:
{"faithfulness": <1-5>, "fieldFit": <1-5>, "relevance": <1-5>, "readability": <1-5>, "issues": ["<each concrete problem, quoting the offending text>"]}`
}

export function parseJudgment(raw: string): ResumeJudgment {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end <= start) throw new Error(`judge returned no JSON: ${raw.slice(0, 200)}`)
  const j = JSON.parse(raw.slice(start, end + 1)) as Partial<ResumeJudgment>
  for (const d of DIMENSIONS) {
    if (typeof j[d] !== 'number' || j[d]! < 1 || j[d]! > 5) throw new Error(`judge score "${d}" missing or out of range`)
  }
  return { ...(j as ResumeJudgment), issues: Array.isArray(j.issues) ? j.issues.map(String) : [] }
}
