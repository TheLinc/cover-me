import type { AIProvider, ParsedResume } from '../../types'

const CLAUDE_API = 'https://api.anthropic.com/v1/messages'
const OPENAI_API = 'https://api.openai.com/v1/chat/completions'

function buildParsePrompt(resumeText: string): string {
  return `You are a resume parser. Convert the resume text below into structured JSON.

RULES:
1. Copy all text verbatim — do not rephrase, summarize, or improve any content
2. Only include these optional fields when the matching section is actually present in the resume:
   - "projects": only if the resume has a personal projects, side projects, portfolio, or open source section
   - "skills": only if the resume has a skills, technical skills, or core competencies section
   - "certifications": only if the resume has a certifications, licenses, or credentials section
3. Recognize experience headers: Work Experience, Professional Experience, Employment, Career History
4. Recognize education headers: Education, Academic Background, Degrees
5. Return ONLY valid JSON — no explanation, no markdown fences, no text before or after

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
  "certifications": ["Certification Name — Issuer — Year"]
}

RESUME:
${resumeText.slice(0, 6000)}`
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

function parseParsedJson(raw: string): ParsedResume {
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
  return parsed
}

export async function parseResumeStructure(
  resumeText: string,
  provider: AIProvider,
  apiKey: string,
): Promise<ParsedResume> {
  const prompt = buildParsePrompt(resumeText)

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
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
      throw new Error(err.error?.message ?? `Claude API error ${res.status}`)
    }
    const data = (await res.json()) as { content: Array<{ type: string; text: string }> }
    const text = data.content.find((b) => b.type === 'text')?.text ?? ''
    return parseParsedJson(text)
  }

  // OpenAI
  const res = await fetch(OPENAI_API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
    throw new Error(err.error?.message ?? `OpenAI API error ${res.status}`)
  }
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> }
  const text = data.choices[0]?.message?.content ?? ''
  return parseParsedJson(text)
}
