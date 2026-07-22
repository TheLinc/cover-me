// One-time resume structuring for the tailor delta prompt. The hosted tier
// stores raw resume text; the tailor function needs the structured shape the
// extension's BYOK path already produces. Parsed once per resume, cached
// encrypted in resumes.structured_encrypted (cleared on re-upload).
//
// The prompt template is mirrored from extension/src/lib/ai/resume-parse.ts —
// scripts/check-prompt-sync.mjs fails the build if the copies drift.

const CLAUDE_API = 'https://api.anthropic.com/v1/messages'

export interface ParsedResume {
  name: string
  email: string
  phone: string
  website: string
  experience: Array<{ title: string; company: string; location: string; dates: string; bullets: string[] }>
  projects?: Array<{ name: string; bullets: string[] }>
  education: Array<{ institution: string; degree: string; location: string; dates: string; bullets: string[] }>
  skills?: string
  certifications?: string[]
}

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

export async function parseResumeStructure(resumeText: string, apiKey: string): Promise<ParsedResume> {
  const res = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      // Haiku is enough here: parsing is verbatim extraction, not judgment —
      // matches the extension's BYOK parse model.
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
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
  return parsed
}
