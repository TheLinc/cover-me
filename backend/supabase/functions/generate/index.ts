import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, handleCors, json } from '../_shared/cors.ts'
import { decrypt } from '../_shared/encrypt.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SECRET_KEY = Deno.env.get('SERVICE_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const FREE_DAILY_LIMIT = 10

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return json({ error: 'Unauthorized' }, 401)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY)

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return json({ error: 'Invalid token' }, 401)

  const userId = user.id

  // Tier check
  const { data: userData } = await supabase
    .from('users')
    .select('tier')
    .eq('id', userId)
    .single()
  const tier = userData?.tier ?? 'hosted_free'

  // Rate limit (free tier only)
  if (tier === 'hosted_free') {
    const today = new Date().toISOString().split('T')[0]
    const { data: rateRow } = await supabase
      .from('rate_limits')
      .select('count')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    const count = rateRow?.count ?? 0
    if (count >= FREE_DAILY_LIMIT) {
      return json(
        { error: `You've used all ${FREE_DAILY_LIMIT} free letters for today. Your limit resets at midnight UTC.` },
        429,
      )
    }

    await supabase.from('rate_limits').upsert(
      { user_id: userId, date: today, count: count + 1 },
      { onConflict: 'user_id,date' },
    )
  }

  // Fetch resume
  const { data: resumeRow, error: resumeError } = await supabase
    .from('resumes')
    .select('text_encrypted')
    .eq('user_id', userId)
    .single()

  if (resumeError || !resumeRow) {
    return json({ error: 'No resume found. Upload your resume in the extension first.' }, 400)
  }

  let resumeText: string
  try {
    resumeText = await decrypt(resumeRow.text_encrypted)
  } catch {
    return json({ error: 'Failed to read resume. Please re-upload.' }, 500)
  }

  // Parse request
  let job: { title: string; company: string; description: string }
  try {
    const body = await req.json()
    job = body.job
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  if (!job?.title || !job?.description) {
    return json({ error: 'Missing job title or description' }, 400)
  }

  // Build prompt and call Claude
  const prompt = buildPrompt(job, resumeText)

  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!claudeRes.ok) {
    const errText = await claudeRes.text()
    console.error('Claude error:', errText)
    return json({ error: 'AI generation failed. Please try again.' }, 502)
  }

  const claudeData = await claudeRes.json() as { content: Array<{ type: string; text: string }> }
  const raw = claudeData.content.find((b) => b.type === 'text')?.text ?? ''
  const letter = stripMarkdown(raw)

  if (!letter) return json({ error: 'Empty response from AI. Please try again.' }, 502)

  return json({ letter })
})

// ── Prompt (mirrors extension/src/lib/ai/index.ts buildPrompt) ───────────────

function buildPrompt(
  job: { title: string; company: string; description: string },
  resumeText: string,
): string {
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
    .replace(/^#+\s+.*$/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
