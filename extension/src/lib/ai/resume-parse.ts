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
3. Recognize experience headers: Work Experience, Professional Experience, Employment, Career History. A section of paid jobs is experience under any heading (Clinical Experience, Work History, Relevant Experience)
4. Recognize education headers: Education, Academic Background, Degrees
5. "otherSections": every other section goes here, in the order it appears: publications, volunteer work, clinical rotations or placements, awards, languages, memberships, interests, references, and anything else. Copy the heading exactly as written and each line or bullet verbatim, without its bullet marker. Volunteer work and clinical rotations go here even when they are laid out like jobs, with titles, organizations and dates. Never put contact details or a summary, profile or objective here; the summary is not part of the output. A list of tools, software or programming languages belongs in "skills". Use [] when the resume has no other sections
6. Return ONLY valid JSON — no explanation, no markdown fences, no text before or after

JSON structure (omit "projects", "skills", "certifications" entirely if those sections do not exist in the resume):
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "phone number or empty string if absent",
  "website": "URL or empty string if absent",
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
  ]
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
  return withOtherSections(parsed)
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
