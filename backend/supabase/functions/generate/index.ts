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

    // Single atomic DB call — check and increment together so concurrent
    // requests cannot both slip through the same count value.
    const { data: allowed, error: rateError } = await supabase
      .rpc('check_and_increment_rate_limit', {
        p_user_id: userId,
        p_date:    today,
        p_limit:   FREE_DAILY_LIMIT,
      })

    if (rateError) {
      console.error('Rate limit RPC error:', rateError.message)
      return json({ error: 'Could not check rate limit. Please try again.' }, 500)
    }

    if (!allowed) {
      return json(
        { error: `You've used all ${FREE_DAILY_LIMIT} free generations for today. Your limit resets at midnight UTC.` },
        429,
      )
    }
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
    ? `Paragraph 3 — Company Fit (2–3 sentences): Name one specific, concrete reason the applicant wants THIS company — derive it only from what is visible in the job description provided (a stated product challenge, a team structure detail, a technical problem described in the posting) — and connect it to something genuine in the applicant's experience. Never draw on assumed external knowledge about the company. Never claim the applicant has personally used, followed, or researched the company's products unless the resume explicitly states it. Specific enough that it could only appear in a letter for this company. Never "I admire your innovative culture."`
    : `Paragraph 3 — Role Fit (2–3 sentences): Since the company is unknown, explain what specifically draws the applicant to this type of role and the challenges it presents, grounded in their experience.`

  const today = new Date().toISOString().split('T')[0]

  return `You are an expert cover letter writer. Write a tailored, human-sounding cover letter for the job application below.

TODAY'S DATE: ${today}
ROLE: ${job.title}
${companyLine}

JOB DESCRIPTION:
${job.description.slice(0, 4000)}

APPLICANT RESUME:
${resumeText.slice(0, 6000)}

---

Follow these steps in order:

STEP 0 — TECHNOLOGY ALLOWLIST (do this before writing anything)
Read the APPLICANT RESUME above. Extract every specific technology, tool, framework, and library named in it. This is your allowlist. Only technologies on this allowlist may appear anywhere in the letter — in any paragraph, in any framing. If a technology appears in the JD but is NOT on this allowlist, it may not appear in the letter under any circumstances. Do not infer allowlist membership from related skills (e.g. "automated testing practices" does not add Jest, Cypress, or React Testing Library to the allowlist — those are specific tools that must appear verbatim in the resume).

STEP 1 — DETECT INDUSTRY
Identify the industry from the job description vocabulary:
- Technology: API, CI/CD, deploy, stack, backend, frontend, database, cloud, framework, repo
- Healthcare: EHR, EMR, HIPAA, BLS, patient care, clinical, nursing, physician, Epic, Cerner
- Finance: AUM, CFA, CPA, GAAP, SOX, Bloomberg, portfolio, deal, equity, securities, audit
- Marketing/Creative: campaign, CTR, CPC, funnel, A/B test, brand, conversion, impressions, ROAS
- Legal: jurisdiction, litigation, deposition, contract, discovery, counsel, plaintiff, defendant

STEP 2 — ADAPT TONE AND KEYWORDS
Apply the tone and approach for the detected industry:

Technology: Direct and efficient. No marketing fluff. Lead with impact at scale — quantified performance, scale handled, cost savings. Include a GitHub or portfolio URL in plain text if present in the resume. Startup roles tolerate personality; large tech companies expect precise, structured language. Use exact stack names from the JD.

Healthcare: Formally professional but not cold. Genuine patient-care language is valued — unlike in tech or finance. Replace hollow virtues ("compassionate," "dedicated") with specific clinical examples that demonstrate those qualities. Lead with specific unit/specialty experience and named certifications (BLS, ACLS, CCRN). Mirror the posting's exact clinical terminology.

Finance: High formality. Error-free prose is a baseline competency signal — a typo implies errors in models and memos. Fewer words are stronger than more. Lead with specific quantified financial results: AUM, deal size, cost savings, budget managed. Reference the specific group, desk, or coverage sector by name. State credentials (CPA, CFA, Series 7/63) early.

Marketing/Creative: Match the company's observable brand voice — read their site copy before writing. The letter is itself a writing sample; a dull marketing letter is self-disqualifying. Lead with a specific campaign metric. Include portfolio URL in plain text if in the resume. Use business outcomes (revenue, conversion, CAC) not vanity metrics (followers, impressions).

Legal: Highest formality of any industry. Precision of language is the job — the letter is evaluated as a writing sample from sentence one. Lead with bar admission state + most relevant experience or clerkship, then immediately connect to a specific matter type from the posting. Name the judge and court for clerkships explicitly. For in-house roles: orient toward business problem-solving, not legal analysis. Never use "To Whom It May Concern."

---

STRUCTURE — 4 paragraphs, salutation, sign-off:

Salutation: ${salutation}

Paragraph 1 — Hook (2–3 sentences):
Lead with what the applicant offers, not what they want. Use one of these proven opening patterns:
- Achievement-first: a quantified result from past work that maps directly to a top requirement of this role
- Problem-solution: name a specific challenge visible in the JD or company context, then signal it has been solved before
- Research signal: reference a specific company product, initiative, or challenge that shows genuine investment
- Bold specific claim: a confident, evidence-backed statement that demands the reader's attention
- Referral: name a mutual contact explicitly in the first sentence if one exists

Never open with any variant of: "I am writing to apply," "I am excited to apply," "I am interested in," "Please accept this letter," "I have always been passionate about," or "My name is."

Paragraph 2 — Core Proof (4–6 sentences):
Present 2–3 accomplishments from the resume that directly map to the top requirements in the JD. For each achievement, use this formula:
  [Strong action verb] + [specific context] + [quantified outcome] + [business impact]

This is NOT a resume restatement — give each metric its narrative context. "When the deployment pipeline was blocking four engineers, I rebuilt it from scratch — deployment time fell 40% and the team reclaimed 20 hours a week" is the cover letter version of a resume bullet. Use the JD's exact terminology when naming the requirement being addressed. Where the resume has no number, use concrete scope: team size, user count, transaction volume, timeline.

${whyCompany}

Paragraph 4 — Close + Call to Action (2–3 sentences):
Restate the top qualification in one specific phrase. Express genuine enthusiasm for this role and this company specifically. End with a direct, confident request for a conversation — not passive, not demanding.

Sign-off: "Kind regards," on its own line, then a blank line, then the applicant's name from the resume.

---

LANGUAGE RULES:

Keywords: Identify 5–10 hard-skill keywords from the JD (tools, certifications, methodologies, domain terms) that the applicant genuinely has. Embed them naturally in sentences — never as a list, never more than twice each. Use the JD's exact phrasing, not synonyms. Only hard skills — soft-skill keywords ("communication," "team player") score nothing in ATS.

A candidate "genuinely has" a keyword only if that exact technology, tool, or framework appears verbatim in their resume. Having a similar or competing tool does not qualify — Zustand is not Redux, Vue is not React, Mocha is not Jest. When the JD requires a tool the candidate lacks, describe the closest real capability they do have without naming the missing tool — do not reference the gap technology at all.

Action verbs: Strong past-tense for past roles: Led, Built, Designed, Optimized, Launched, Reduced, Generated, Negotiated, Delivered, Streamlined, Orchestrated, Partnered, Authored, Exceeded, Drove, Shipped, Architected, Scaled, Mentored. Present tense for current role only.

Voice: Vary sentence length — short punchy sentences mixed with longer ones. If any paragraph reads like a press release or a template essay, rewrite it. Each paragraph should feel distinct in rhythm.

Personalization: Reference the company by name at least twice. Include at least one concrete detail drawn from the job description itself — a specific product area, team structure, workflow, or stated challenge — that shows the applicant read this posting carefully. Do not achieve personalization by enumerating the employer's tech stack or claiming to have used tools not on the resume.

---

ABSOLUTE PROHIBITIONS:

Forbidden openers (any variant): "I am writing to apply," "I am excited to apply," "I am writing to express my interest," "Please accept this letter," "I have always been passionate about," "My name is"

Clichés (never use): hard worker, hard-working, team player, detail-oriented, results-driven, results-oriented, go-getter, self-starter, think outside the box, dynamic, passionate, dedicated, motivated, enthusiastic, fast learner, proven track record, strong communication skills, I believe I would be a great fit, I am confident that my background

AI-flagged vocabulary (never use): delve, realm, intricate, showcasing, pivotal, tapestry, synergistic, synergy, testament, underscore, facilitate, beacon, meticulous, transformative, leverage (when used abstractly rather than literally)

AI-tell patterns (never produce these): repeating the same "by doing X, I achieved Y" sentence structure in every paragraph; uniform sentence rhythm with no variation; excessive politeness throughout; claiming passion or dedication without a single specific example; using the company name exactly once in a formulaic opener and never again

Passive close phrases (never use): I hope to hear from you, feel free to contact me at your convenience, I would be happy to discuss, I look forward to hearing from you at your earliest convenience

No fabricated technology claims: Never mention a technology, framework, language, or tool that does not appear in the applicant's resume. This prohibition covers every framing — including "adjacent to", "similar to", "equivalent to", "mirrors", and compound phrasings like "Redux-adjacent state management (Zustand)". If the JD lists a stack the applicant does not have, do not reference those technologies at all — describe what the candidate can genuinely do instead. Never enumerate or echo back the employer's tech stack as proof of fit (e.g. "Your stack of React, Redux, Jest, Cypress is exactly the toolkit I've used") — this fabricates ownership of every tool listed and reads as mirroring the JD, not as evidence of real experience.

No fabricated personal knowledge: Never claim the applicant has personally followed, used, or researched the company's products, history, or evolution unless it is explicitly stated in the resume. All company-specific details must be derivable solely from the job description provided.

---

FORMAT RULES:
- Plain text only — no markdown, no # headers, no **bold**, no bullet points, no asterisks, no dashes as list markers
- 250–400 words total (excluding salutation and sign-off)
- No subject line, date, or postal address block
- No contact information (no phone, email, or URL) — the recruiter has this from the application
- ${companyKnown ? '' : 'Company name is unknown — refer to "the team" or "the role" rather than any company name'}
- This must read as a letter written by a specific human for this specific job — not a template`
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
