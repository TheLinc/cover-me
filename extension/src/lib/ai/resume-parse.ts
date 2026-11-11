import type { AIProvider, ParsedResume } from '../../types'
import { claudeDelta, HAIKU_MODEL, readSseText } from './claude'
import { OPENAI_CHAT, OPENAI_PARSE_FIELDS } from './openai'

const CLAUDE_API = 'https://api.anthropic.com/v1/messages'

// The most resume text a prompt carries. A long master resume (three pages,
// fifteen bullets a role) runs about 13,000 characters; the old 12,000 cap
// cut off whatever came last, usually education.
export const MAX_RESUME_CHARS = 40000

// Bumped when the parse keeps more of the resume, so a cached parse from an
// older parser (cut off at 12,000 characters, no headline, project links or
// section entries) is made again on the next tailor.
export const PARSE_VERSION = 2

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
5. "headline": the professional title line printed directly under the name, if any ("Applied AI Engineer"), copied verbatim; "" when the resume has none. Never a job title taken from the experience section
6. "projects": copy each project's URL into "link" and a line listing its technologies into "tech", verbatim, instead of putting them in the name or the bullets; "" when absent
7. "otherSections": every other section goes here, in the order it appears: publications, volunteer work, clinical rotations or placements, awards, languages, memberships, interests, references, and anything else. Copy the heading exactly as written and each line or bullet verbatim, without its bullet marker. Volunteer roles and student clinical rotations, placements, practicums or clerkships go here even when they are laid out like jobs, with titles, organizations and dates; a paid position stays in experience. Never put contact details or a summary, profile or objective here; the summary is not part of the output. A list of tools, software or programming languages belongs in "skills". Use [] when the resume has no other sections. When a section is made of entries, each a name with lines such as a role, placing, issuer, date or URL and then bullets (open-source packages, awards, hackathons, publications with details), give it "entries" instead of "lines": the name, the role or placing line as "subtitle", any URL as "link", any date as "dates", and the bullets verbatim. Lines that are not part of an entry go in "lines"
8. Return ONLY valid JSON — no explanation, no markdown fences, no text before or after

JSON structure (omit "projects", "skills", "certifications" entirely if those sections do not exist in the resume):
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "phone number or empty string if absent",
  "location": "the candidate's own city or region from the contact details, or empty string if absent",
  "website": "the first URL in the contact details, or empty string if absent",
  "headline": "professional title line under the name, or empty string if absent",
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
      "link": "project URL, or empty string",
      "tech": "technologies line copied verbatim, or empty string",
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
  "skills": "skills string exactly as written in the resume; when the skills are in labelled groups (Languages: …), one group per line, lines separated by \\n",
  "certifications": ["each certification or license line copied verbatim"],
  "otherSections": [
    {
      "heading": "Section heading exactly as written",
      "lines": ["each line copied verbatim"],
      "entries": [{ "name": "Entry name", "subtitle": "role or placing line", "link": "URL or empty string", "dates": "date or empty string", "bullets": ["bullet copied verbatim"] }]
    }
  ]
}

RESUME:
${resumeText.slice(0, MAX_RESUME_CHARS)}`
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
export function withOtherSections<T extends object>(parsed: T): T & { otherSections: Array<{ heading: string; lines: string[]; entries?: Array<{ name: string; subtitle?: string; link?: string; dates?: string; bullets: string[] }> }> } {
  const raw = (parsed as { otherSections?: unknown }).otherSections
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((l: unknown): l is string => typeof l === 'string' && l.trim().length > 0) : [])
  const otherSections = (Array.isArray(raw) ? raw : []).flatMap((s) => {
    const heading = str(s?.heading)
    const lines = strings(s?.lines)
    const entries = (Array.isArray(s?.entries) ? s.entries : []).flatMap((e: Record<string, unknown> | null) => {
      const name = str(e?.name)
      if (!name) return []
      const entry: { name: string; subtitle?: string; link?: string; dates?: string; bullets: string[] } = { name, bullets: strings(e?.bullets) }
      for (const key of ['subtitle', 'link', 'dates'] as const) if (str(e?.[key])) entry[key] = str(e?.[key])
      return [entry]
    })
    return heading && (lines.length || entries.length) ? [{ heading, lines, ...(entries.length ? { entries } : {}) }] : []
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
// The headline and each project's link and tech line, kept only when the
// model found them: an empty string would print an empty line or a stray "|".
export function withDetails<T extends object>(parsed: T): T {
  const out = { ...parsed } as Record<string, unknown>
  const headline = typeof out.headline === 'string' ? out.headline.trim() : ''
  if (headline) out.headline = headline
  else delete out.headline
  if (Array.isArray(out.projects)) {
    out.projects = out.projects.map((p: Record<string, unknown>) => {
      const proj = { ...p }
      for (const key of ['link', 'tech']) {
        const v = typeof proj[key] === 'string' ? (proj[key] as string).trim() : ''
        if (v) proj[key] = v
        else delete proj[key]
      }
      return proj
    })
  }
  return out as T
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
  return withDetails(withLinks(withOtherSections(parsed)))
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
        // A long master resume comes back as ~8,000 tokens of JSON.
        max_tokens: 16000,
        stream: true,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
      throw new Error(err.error?.message ?? `Claude API error ${res.status}`)
    }
    return { ...parseParsedJson(await readSseText(res, claudeDelta)), parseVersion: PARSE_VERSION }
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
  return { ...parseParsedJson(await readSseText(res, chatDelta)), parseVersion: PARSE_VERSION }
}

function chatDelta(ev: Record<string, unknown>): string | undefined {
  return (ev.choices as Array<{ delta?: { content?: string } }> | undefined)?.[0]?.delta?.content
}
