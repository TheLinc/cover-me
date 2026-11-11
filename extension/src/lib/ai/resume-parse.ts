import type { AIProvider, ParsedResume } from '../../types'
import { claudeDelta, HAIKU_MODEL, readSseText } from './claude'
import { OPENAI_CHAT, OPENAI_PARSE_FIELDS } from './openai'

const CLAUDE_API = 'https://api.anthropic.com/v1/messages'

export function buildParsePrompt(resumeText: string): string {
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

function isValidParsedResume(r: unknown): r is ParsedResume {
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

// The order the resume's sections sat in (#165), which the layouts print
// them in: each standard section the parse has, once, and an "other" for each
// extra section at most. The tailor writes the summary, so it leads. Always
// an array, [] when nothing valid is left: the tailor treats a cached parse
// without one as made before the order was kept, and parses again. Run after
// withOtherSections, which settles the number of extra sections.
export function withSectionOrder<T extends ParsedResume>(parsed: T): T & { sectionOrder: NonNullable<ParsedResume['sectionOrder']> } {
  const raw = (parsed as { sectionOrder?: unknown }).sectionOrder
  const unplaced: Record<string, boolean> = {
    experience: parsed.experience.length > 0,
    projects: Array.isArray(parsed.projects) && parsed.projects.length > 0,
    education: parsed.education.length > 0,
    certifications: Array.isArray(parsed.certifications) && parsed.certifications.length > 0,
    skills: typeof parsed.skills === 'string' && parsed.skills.trim().length > 0,
  }
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
// ── End mirrored parse normalizers ──

export function parseParsedJson(raw: string): ParsedResume {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('Resume parse returned invalid JSON. Please try again.')
  }
  if (!isValidParsedResume(parsed)) {
    throw new Error('Resume parse returned incomplete data. Please try again.')
  }
  return withSectionOrder(withLinks(withOtherSections(parsed)))
}

export async function parseResumeStructure(
  resumeText: string,
  provider: AIProvider,
  apiKey: string,
): Promise<ParsedResume> {
  const prompt = buildParsePrompt(resumeText)

  // Both providers stream: a resume near the 12,000-character cap took 30-31 s
  // to parse on either, and Chrome stops a service worker whose fetch() gets no
  // response for 30 s.
  if (provider === 'claude') {
    const res = await fetch(CLAUDE_API, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        max_tokens: 6000,
        stream: true,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
      throw new Error(err.error?.message ?? `Claude API error ${res.status}`)
    }
    return parseParsedJson(await readSseText(res, claudeDelta))
  }

  // OpenAI
  const res = await fetch(OPENAI_CHAT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ ...OPENAI_PARSE_FIELDS, stream: true, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
    throw new Error(err.error?.message ?? `OpenAI API error ${res.status}`)
  }
  return parseParsedJson(await readSseText(res, chatDelta))
}

function chatDelta(ev: Record<string, unknown>): string | undefined {
  return (ev.choices as Array<{ delta?: { content?: string } }> | undefined)?.[0]?.delta?.content
}
