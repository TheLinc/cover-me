import type { AIProvider, JobData } from '../../types'
import { callClaude } from './claude'
import { callOpenAI } from './openai'

export async function generateCoverLetter(
  job: JobData,
  resumeText: string,
  provider: AIProvider,
  apiKey: string,
): Promise<string> {
  const prompt = buildPrompt(job, resumeText)
  const raw = await (provider === 'claude' ? callClaude(prompt, apiKey) : callOpenAI(prompt, apiKey))
  return stripMarkdown(raw)
}

function buildPrompt(job: JobData, resumeText: string): string {
  const companyKnown = job.company && job.company !== 'Unknown Company'
  const companyLine = companyKnown
    ? `COMPANY: ${job.company}`
    : `COMPANY: Unknown — do not reference a specific company name anywhere in the letter`

  const salutation = companyKnown
    ? `"Dear Hiring Manager," or "Dear ${job.company} Team,"`
    : `"Dear Hiring Manager,"`

  const whyCompany = companyKnown
    ? `Paragraph 3 — Why This Company (2–3 sentences): Name one specific, concrete reason the applicant wants THIS company — pick up on anything in the job description that signals the company's mission, product, values, or growth stage, and connect it to something genuine in the applicant's experience. This must be specific enough that it could only appear in a letter for this company, not a generic "I admire your innovative culture."`
    : `Paragraph 3 — Why This Role (2–3 sentences): Since the company is unknown, explain what draws the applicant to this type of role and the challenges it presents, grounded in their experience.`

  return `You are a professional cover letter writer. Write a tailored, human-sounding cover letter for the job application below.

ROLE: ${job.title}
${companyLine}

JOB DESCRIPTION:
${job.description.slice(0, 4000)}

APPLICANT RESUME:
${resumeText.slice(0, 6000)}

---

STRUCTURE — follow exactly, 4 paragraphs plus salutation and sign-off:

Salutation: ${salutation}

Paragraph 1 — Hook (2–3 sentences): Open with something specific — a quantified achievement, a direct connection between the applicant's work and a top requirement from the job description, or a concrete insight about the role. Never open with "I am writing to apply," "I am excited to apply," "I am writing to express my interest," or any variant. The opening must make a reader want to continue.

Paragraph 2 — Core Proof (4–6 sentences): Present 2–3 accomplishments from the resume that directly map to the top requirements in the job description. Use compressed STAR format for each: briefly name the situation/problem, what the applicant did (strong action verb), and the quantified result. Use the job description's exact language when naming the requirement being addressed, but use the applicant's own voice for the evidence. Where the resume lacks numbers, use concrete scope (team size, scale, timeline).

${whyCompany}

Paragraph 4 — Close + Call to Action (2–3 sentences): Briefly restate the applicant's fit in one specific phrase. Express genuine enthusiasm for this role specifically. End with a direct, confident request for a conversation — not passive ("I hope to hear from you") and not demanding.

Sign-off: "Kind regards," on its own line, then a blank line, then the applicant's name from the resume.

---

LANGUAGE RULES:

Keywords: Identify 4–6 hard-skill or domain keywords from the job description (tools, methodologies, certifications, industry terms) that the applicant genuinely has. Embed them naturally in sentences — never as a list, never more than twice each.

Action verbs: Use strong past-tense verbs for past roles (Led, Built, Designed, Optimized, Launched, Reduced, Generated, Negotiated, Delivered, Streamlined, Orchestrated, Partnered, Authored, Exceeded). Present tense for current role only.

Voice: Vary sentence length deliberately — short punchy sentences mixed with longer ones. Read it aloud mentally; if it sounds like a press release, rewrite those lines.

---

ABSOLUTE PROHIBITIONS — never use any of these:

Forbidden openers (any variant): "I am writing to apply," "I am excited to apply," "I am writing to express my interest," "Please accept this letter"

Clichés (do not use): hard worker, hard-working, team player, detail-oriented, results-driven, results-oriented, go-getter, self-starter, think outside the box, dynamic, passionate, proven track record, strong communication skills, I believe I would be a great fit, I am confident that my background

AI-flagged words (never use): delve, realm, intricate, showcasing, pivotal, tapestry, synergistic, synergy, leverage (when used abstractly)

Passive close phrases (do not use): I hope to hear from you, feel free to contact me at your convenience, I would be happy to discuss, I look forward to hearing from you at your earliest convenience

---

FORMAT RULES:
- Plain text only — no markdown, no # headers, no **bold**, no bullet points, no asterisks, no dashes as list markers
- 250–400 words total (excluding salutation and sign-off)
- No subject line, date, or postal address block
- No contact information of any kind (no phone number, email, LinkedIn URL) — the recruiter has this from the application
- ${companyKnown ? '' : 'Company name is unknown — refer to "the team" or "the role" rather than any specific company name'}
- Sound like a specific human wrote this letter about this specific job — not a template sent to 200 employers`
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^#+\s+.*$/gm, '')          // # headings
    .replace(/\*\*(.+?)\*\*/g, '$1')     // **bold**
    .replace(/\*(.+?)\*/g, '$1')         // *italic*
    .replace(/^[-*]\s+/gm, '')           // - bullet points
    .replace(/`(.+?)`/g, '$1')           // `code`
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // [links](url)
    .replace(/\n{3,}/g, '\n\n')          // 3+ blank lines → double
    .trim()
}
