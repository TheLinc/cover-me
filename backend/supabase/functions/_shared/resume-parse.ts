// One-time resume structuring for the tailor delta prompt. The hosted tier
// stores raw resume text; the tailor function needs the structured shape the
// extension's BYOK path already produces. Parsed once per resume, cached
// encrypted in resumes.structured_encrypted. The resume function parses a new
// upload in the background; new text clears the old copy, the same text keeps it.
//
// The prompt template is mirrored from extension/src/lib/ai/resume-parse.ts —
// scripts/check-prompt-sync.mjs fails the build if the copies drift.

import { ANTHROPIC_MESSAGES_URL, HAIKU_MODEL } from './anthropic.ts'

export interface ParsedResume {
  name: string
  email: string
  phone: string
  website: string
  /** Every URL on the contact line, website first. Absent on a parse made before #129. */
  links?: string[]
  location?: string
  experience: Array<{ title: string; company: string; location: string; dates: string; bullets: string[] }>
  projects?: Array<{ name: string; bullets: string[] }>
  education: Array<{ institution: string; degree: string; location: string; dates: string; bullets: string[] }>
  skills?: string
  certifications?: string[]
  /** Always an array on a parse made since #54; a cached parse without it predates them and is parsed again. */
  otherSections?: Array<{ heading: string; lines: string[] }>
  /** The uploaded resume's section order (#165), carried to each tailored resume. Always an array on a parse made since then; a cached parse without it is parsed again. */
  sectionOrder?: Array<'summary' | 'experience' | 'projects' | 'education' | 'certifications' | 'skills' | 'other'>
}

function buildParsePrompt(resumeText: string): string {
  return `You are a resume parser. Convert the resume text below into structured JSON.

RULES:
1. Copy all text verbatim — do not rephrase, summarize, or improve any content
2. Only include these optional fields when the matching section is actually present in the resume:
   - "projects": only if the resume has a personal projects, side projects, portfolio, or open source section
   - "skills": only if the resume has a skills, technical skills, or core competencies section
   - "certifications": only if the resume has a certifications, licenses, or credentials section
3. Recognize experience headers: Work Experience, Professional Experience, Employment, Career History. A section of jobs, each a position held at an employer, is experience under any heading (Clinical Experience, Work History, Relevant Experience)
4. Recognize education headers: Education, Academic Background, Degrees
5. "otherSections": every other section goes here, in the order it appears: publications, volunteer work, clinical rotations or placements, awards, languages, memberships, interests, references, and anything else. Copy the heading exactly as written and each line or bullet verbatim, without its bullet marker. Volunteer roles and student clinical rotations, placements, practicums or clerkships go here even when they are laid out like jobs, with titles, organizations and dates; a paid position stays in experience. Never put contact details or a summary, profile or objective here; the summary is not part of the output. A list of tools, software or programming languages belongs in "skills". Use [] when the resume has no other sections
6. "sectionOrder": the resume's sections from top to bottom, one entry each: "experience", "projects", "education", "certifications" or "skills" for those sections, and "other" for each entry of "otherSections", where it sits. Leave out the contact details and the summary
7. Return ONLY valid JSON — no explanation, no markdown fences, no text before or after

JSON structure (omit "projects", "skills", "certifications" entirely if those sections do not exist in the resume):
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "phone number or empty string if absent",
  "location": "the candidate's own city or region from the contact details, or empty string if absent",
  "website": "the first URL in the contact details, or empty string if absent",
  "links": ["every URL in the contact details (website, LinkedIn, GitHub, portfolio), copied verbatim in the order written"],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "City, Province/State",
      "dates": "Month Year – Month Year",
      "bullets": ["bullet text copied verbatim"]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "bullets": ["bullet text copied verbatim"]
    }
  ],
  "education": [
    {
      "institution": "School Name",
      "degree": "Degree and Major",
      "location": "City, Province/State",
      "dates": "Year – Year",
      "bullets": ["achievement bullets copied verbatim"]
    }
  ],
  "skills": "skills string exactly as written in the resume",
  "certifications": ["each certification or license line copied verbatim"],
  "otherSections": [
    {
      "heading": "Section heading exactly as written",
      "lines": ["each line copied verbatim"]
    }
  ],
  "sectionOrder": ["certifications", "experience", "other", "education", "skills"]
}

RESUME:
${resumeText.slice(0, 12000)}`
}

export function isValidParsedResume(r: unknown): r is ParsedResume {
  if (!r || typeof r !== 'object') return false
  const resume = r as Record<string, unknown>
  return (
    typeof resume.name === 'string' &&
    typeof resume.email === 'string' &&
    Array.isArray(resume.experience) &&
    Array.isArray(resume.education)
  )
}

// ── Parse normalizers (mirrored: extension/src/lib/ai/resume-parse.ts ⇄ backend/supabase/functions/_shared/resume-parse.ts) ──
// The model's otherSections, kept only where each entry is a heading with
// verbatim lines, and always an array: the tailor treats a cached parse
// without one as made before extra sections were kept, and parses again.
export function withOtherSections<T extends object>(parsed: T): T & { otherSections: Array<{ heading: string; lines: string[] }> } {
  const raw = (parsed as { otherSections?: unknown }).otherSections
  const otherSections = (Array.isArray(raw) ? raw : []).flatMap((s) => {
    const heading = typeof s?.heading === 'string' ? s.heading.trim() : ''
    const lines = Array.isArray(s?.lines) ? s.lines.filter((l: unknown): l is string => typeof l === 'string' && l.trim().length > 0) : []
    return heading && lines.length ? [{ heading, lines }] : []
  })
  return { ...parsed, otherSections }
}

// Every contact-line URL, with website first and set, so a build that prints
// only website (the store's before #129) still shows one. Left off when there
// are none: renderers then fall back to website.
export function withLinks<T extends { website: string }>(parsed: T): T {
  const raw = (parsed as { links?: unknown }).links
  const links = (Array.isArray(raw) ? raw : []).filter((l): l is string => typeof l === 'string' && l.trim().length > 0).map((l) => l.trim())
  const website = typeof parsed.website === 'string' ? parsed.website.trim() : ''
  if (website && !links.includes(website)) links.unshift(website)
  return links.length ? { ...parsed, website: website || links[0]!, links } : parsed
}

// Which standard sections the parse has content for.
function sectionsPresent(parsed: ParsedResume): Record<string, boolean> {
  return {
    experience: parsed.experience.length > 0,
    projects: Array.isArray(parsed.projects) && parsed.projects.length > 0,
    education: parsed.education.length > 0,
    certifications: Array.isArray(parsed.certifications) && parsed.certifications.length > 0,
    skills: typeof parsed.skills === 'string' && parsed.skills.trim().length > 0,
  }
}

// Where the resume's sections sit in its text (#165). The parse model often
// lists them in its JSON's order (experience, projects, education, skills)
// rather than the resume's, so each section the parse has is found by its own
// verbatim copies instead: each line of the text counts for the section whose
// strings cover most of it, and a section sits at its best-covered line. null
// when a section can't be found, so the model's order stands.
export function sectionOrderFromText(parsed: ParsedResume, resumeText: string): NonNullable<ParsedResume['sectionOrder']> | null {
  const norm = (s: unknown) => (typeof s === 'string' ? s.toLowerCase().replace(/\s+/g, ' ').trim() : '')
  const strings = (xs: unknown[]) => xs.flat(2).map(norm).filter((s) => s.length >= 3)
  const present = sectionsPresent(parsed)
  const sections: Array<{ key: NonNullable<ParsedResume['sectionOrder']>[number]; strings: string[] }> = [
    { key: 'experience' as const, strings: strings(parsed.experience.map((e) => [e?.title, e?.company, e?.bullets])) },
    { key: 'projects' as const, strings: strings((parsed.projects ?? []).map((p) => [p?.name, p?.bullets])) },
    { key: 'education' as const, strings: strings(parsed.education.map((e) => [e?.institution, e?.degree, e?.bullets])) },
    { key: 'certifications' as const, strings: strings(parsed.certifications ?? []) },
    { key: 'skills' as const, strings: strings(typeof parsed.skills === 'string' ? parsed.skills.split(/[,;•|\n]/) : []) },
  ].filter((s) => present[s.key])
  for (const o of parsed.otherSections ?? []) sections.push({ key: 'other', strings: strings([o.heading, o.lines]) })

  // A string inside the line counts its length; a line inside a longer string
  // (a bullet the text wraps) counts the line's.
  const cover = (line: string, ss: string[]) => ss.reduce((n, s) => n + (line.includes(s) ? s.length : line.length >= 12 && s.includes(line) ? line.length : 0), 0)
  const best = sections.map(() => ({ line: -1, score: 0 }))
  resumeText.split('\n').map(norm).forEach((line, i) => {
    if (line.length < 3) return
    const scores = sections.map((s) => cover(line, s.strings))
    const top = Math.max(...scores)
    const k = scores.indexOf(top)
    // A tie could be either section's line.
    if (top > 0 && scores.lastIndexOf(top) === k && top > best[k]!.score) best[k] = { line: i, score: top }
  })
  if (best.some((b) => b.line < 0)) return null
  return sections.map((s, i) => ({ key: s.key, line: best[i]!.line })).sort((a, b) => a.line - b.line).map((s) => s.key)
}

// The order the resume's sections sat in (#165), which the layouts print
// them in: each standard section the parse has, once, and an "other" for each
// extra section at most. The tailor writes the summary, so it leads. Taken
// from the resume text when given (sectionOrderFromText), else the model's.
// Always an array, [] when nothing valid is left: the tailor treats a cached
// parse without one as made before the order was kept, and parses again. Run
// after withOtherSections, which settles the number of extra sections.
export function withSectionOrder<T extends ParsedResume>(parsed: T, resumeText?: string): T & { sectionOrder: NonNullable<ParsedResume['sectionOrder']> } {
  const raw = (resumeText ? sectionOrderFromText(parsed, resumeText) : null) ?? (parsed as { sectionOrder?: unknown }).sectionOrder
  const unplaced = sectionsPresent(parsed)
  let others = Array.isArray(parsed.otherSections) ? parsed.otherSections.length : 0
  const order: NonNullable<ParsedResume['sectionOrder']> = []
  for (const key of Array.isArray(raw) ? raw : []) {
    if (key === 'other') {
      if (others > 0) {
        others--
        order.push(key)
      }
    } else if (typeof key === 'string' && unplaced[key] === true) {
      unplaced[key] = false
      order.push(key as (typeof order)[number])
    }
  }
  return { ...parsed, sectionOrder: order.length ? ['summary', ...order] : [] }
}

// A cached parse made since the parse kept extra sections (#54) and section
// order (#165). One from before is parsed again, once.
export function isCurrentParse(parsed: ParsedResume | null | undefined): parsed is ParsedResume & Required<Pick<ParsedResume, 'otherSections' | 'sectionOrder'>> {
  return Array.isArray(parsed?.otherSections) && Array.isArray(parsed?.sectionOrder)
}

// What replaces a cached parse that isn't current, given a fresh parse of the
// same text. One that only lacks the order keeps its content and takes the
// fresh order, so a Word design checked against it still lines up. Anything
// older is replaced.
export function upgradedParse(cached: ParsedResume | null | undefined, fresh: ParsedResume): ParsedResume {
  return cached && Array.isArray(cached.otherSections) ? withSectionOrder({ ...cached, sectionOrder: fresh.sectionOrder }) : fresh
}

// The parse with the section order the user chose in the editor (#197).
// order: a tailored resume's sectionOrder with its deleted sections put back;
// headings: its extra sections' headings, in that order. Each extra section
// is matched to the parse's by heading, then by place, so moves between them
// carry over. A section the order leaves out goes back to its old index.
export function withChosenOrder<T extends ParsedResume>(parsed: T, order: unknown, headings: unknown): T & { sectionOrder: NonNullable<ParsedResume['sectionOrder']> } {
  const norm = (s: unknown) => (typeof s === 'string' ? s.trim().toLowerCase() : '')
  const own = Array.isArray(parsed.otherSections) ? parsed.otherSections : []
  const left = own.map((_, i) => i)
  const named = (Array.isArray(headings) ? headings : []).map((h) => {
    const i = left.find((j) => norm(own[j]!.heading) === norm(h))
    if (i === undefined) return -1
    left.splice(left.indexOf(i), 1)
    return i
  })
  const placed = named.map((i) => (i >= 0 ? i : left.shift())).filter((i): i is number => i !== undefined)
  const otherSections = [...placed, ...left].map((i) => own[i]!)
  const keys: unknown[] = Array.isArray(order) ? [...order] : []
  let others = keys.filter((k) => k === 'other').length
  for (const [i, k] of (parsed.sectionOrder ?? []).entries()) {
    if (k === 'other' ? others-- > 0 : keys.includes(k)) continue
    keys.splice(Math.min(i, keys.length), 0, k)
  }
  // withSectionOrder puts the summary first, as a parse has it, and drops what
  // the parse lacks. The user may have moved the summary: it goes after the
  // sections kept from those above it.
  const { sectionOrder } = withSectionOrder({ ...parsed, otherSections, sectionOrder: keys as ParsedResume['sectionOrder'] })
  const rest = sectionOrder.slice(1)
  let at = 0
  for (const k of keys.slice(0, Math.max(keys.indexOf('summary'), 0))) if (k === rest[at]) at++
  return { ...parsed, otherSections, sectionOrder: at > 0 ? [...rest.slice(0, at), 'summary', ...rest.slice(at)] : sectionOrder }
}
// ── End mirrored parse normalizers ──

export async function parseResumeStructure(resumeText: string, apiKey: string): Promise<ParsedResume> {
  const res = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      // Haiku is enough here: parsing is verbatim extraction, not judgment —
      // matches the extension's BYOK parse model.
      model: HAIKU_MODEL,
      max_tokens: 6000,
      messages: [{ role: 'user', content: buildParsePrompt(resumeText) }],
    }),
  })
  if (!res.ok) {
    console.error('Resume parse Claude error:', await res.text())
    throw new Error('Resume parse failed')
  }
  const data = await res.json() as { content: Array<{ type: string; text: string }> }
  const raw = data.content.find((b) => b.type === 'text')?.text ?? ''
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('Resume parse returned invalid JSON')
  }
  if (!isValidParsedResume(parsed)) throw new Error('Resume parse returned incomplete data')
  return withSectionOrder(withLinks(withOtherSections(parsed)), resumeText)
}
