import type { AIProvider, JobData, ParsedResume, TailoredResume } from '../../types'

const CLAUDE_API = 'https://api.anthropic.com/v1/messages'
const OPENAI_API = 'https://api.openai.com/v1/chat/completions'

function buildTailorSchema(parsed: ParsedResume): string {
  const resume: Record<string, unknown> = {
    name: 'string',
    phone: 'string',
    email: 'string',
    website: 'string',
    summary: 'string — 2-3 sentence professional summary, no first-person pronouns',
    experience: [{ title: 'string', company: 'string', location: 'string', dates: 'string', bullets: ['string'] }],
  }
  if (parsed.projects?.length) {
    resume.projects = [{ name: 'string', bullets: ['string'] }]
  }
  resume.education = [{ institution: 'string', degree: 'string', location: 'string', dates: 'string', bullets: ['string'] }]
  if (parsed.certifications?.length) {
    resume.certifications = ['string']
  }
  if (parsed.skills) {
    resume.skills = 'string'
  }
  return JSON.stringify({ resume, atsScore: 'number (0–100)', atsGaps: ['string — one specific gap per item'] }, null, 2)
}

function buildPrompt(job: JobData, parsed: ParsedResume, compact: boolean, supplemental?: string, trim = false, includeSummary = true): string {
  const company = job.company && job.company !== 'Unknown Company' ? job.company : 'Unknown'
  const today = new Date().toISOString().split('T')[0]

  const step8 = parsed.skills ? `
STEP 8 — OPTIMIZE SKILLS
Reorder the skills string so the most relevant skills for this job appear first, using the job description's exact phrasing where it differs from the resume.

ADDING skills — a skill may only be added if BOTH conditions are met:
  1. It appears as a keyword in the job description, AND
  2. It is strongly related to an existing skill already on the resume — same language ecosystem, a direct superset/subset, or a tool the candidate demonstrably uses alongside an existing skill.

Strong relationship examples (addition allowed):
  SQL already on resume + job says PostgreSQL → add PostgreSQL (PostgreSQL IS an SQL database)
  JavaScript already on resume + job says TypeScript → add TypeScript (TypeScript is a superset of JavaScript)

Weak/no relationship examples (do NOT add):
  PHP on resume + job says C# .NET → do NOT add (different language ecosystems, unrelated)
  React on resume + job says Vue → do NOT add (competing frameworks, not a superset/subset)
  JavaScript on resume + job says Python → do NOT add (unrelated languages)
  Zustand on resume + job says Redux → do NOT add (both manage state, but they are separate libraries with different APIs — candidate must have used Redux to claim it)
  Jest on resume + job says Cypress → do NOT add (different testing tools, not a superset/subset)

If in doubt, do not add. A fabricated skill that the candidate cannot demonstrate in an interview causes immediate rejection.

CAPABILITY CATEGORIES — a special case for adding skills. If the JD uses a broad capability term AND the candidate demonstrably has that capability through specific tools already on the resume, add the category term even though it is not a specific tool. This is not fabrication — it is accurate labelling of real work.

  Category addition examples (allowed):
    MUI, shadcn/ui, or similar on resume + JD says "component library" or "design system" → add "Component Libraries" and/or "Design Systems"
    Redux, Zustand, or Context API on resume + JD says "state management" → add "State Management"
    Jest, Vitest, Cypress, RTL, or similar on resume + JD says "testing" or "automated testing" → add "Testing" (the category label only — never add a specific testing tool not already on the resume)
    REST APIs, GraphQL, or fetch/axios on resume + JD says "API integration" → add "API Integrations"

  Do NOT add a category term if the candidate has no tools in that category on their resume. The tools must already be present.

  CRITICAL: Capability categories add the CATEGORY LABEL only — never a specific tool from that category that is not already on the resume. If the candidate has Zustand but not Redux, you may add "State Management" but you may NEVER add "Redux". If the candidate has zero testing tools in their resume, you may NOT add "Testing" or any specific framework name (Jest, Cypress, RTL, etc.).

REMOVING skills — only remove a skill if it is clearly irrelevant to the role type (e.g. a mobile-only framework for a pure web role). Neutral and adjacent skills should be kept. A truthful broad list never hurts ATS; over-trimming loses real signal. Keep the list to 15–20 items maximum.
` : ''

  const certRule = parsed.certifications?.length
    ? '\n5. CERTIFICATIONS are immutable — copy every entry character-for-character. Do not add, remove, or rephrase any certification.'
    : ''

  const compactMode = compact ? `---

COMPACT MODE — SINGLE PAGE REQUIRED:
The output must fit on a single letter page. Apply these additional constraints (they override the general rules below where they conflict):
- Reduce to a maximum of 3 bullets per role — keep the most relevant 3, drop the rest
- Every bullet must fit on a single line (100 characters maximum)
- Shorten the skills string to the 10 most relevant skills only
- The bullet budget rule (STEP 5) does NOT apply in compact mode — use these constraints instead
- The summary may be omitted in compact mode if space is critical

` : ''

  return `You are an expert resume writer and ATS optimization specialist. Tailor the candidate's resume for the specific job below by rewriting content — never fabricating it.

TODAY'S DATE: ${today}
TARGET ROLE: ${job.title}
COMPANY: ${company}

JOB DESCRIPTION:
${job.description.slice(0, 4000)}

CANDIDATE RESUME (structured JSON extracted verbatim from the candidate's actual resume):
${JSON.stringify(parsed, null, 2)}
${supplemental?.trim() ? `
SUPPLEMENTAL CANDIDATE CONTEXT (verified by the candidate — real experience not captured in the resume above):
${supplemental.trim()}

Use this context to strengthen existing bullets where the experience is relevant and accurate. Do not add bullet entries beyond the budget set in STEP 5 — weave the context into the most applicable existing bullets.
` : ''}
---

Follow these steps in order:

STEP 1 — DETECT INDUSTRY
Identify the industry from the job description. Use this to guide which metrics and keywords matter most:
- Technology: API, CI/CD, deploy, stack, backend, frontend, database, cloud, framework, repo
- Healthcare: EHR, EMR, HIPAA, BLS, ACLS, patient care, clinical, nursing, physician, compliance
- Finance: AUM, CFA, CPA, GAAP, SOX, Bloomberg, portfolio, deal, equity, securities, audit
- Marketing/Creative: campaign, CTR, CPC, funnel, A/B test, creative brief, brand, conversion, impressions
- Legal: jurisdiction, litigation, deposition, contract, discovery, counsel, plaintiff, defendant

STEP 2 — KEYWORD ANALYSIS & TIERING
Classify keywords from the job description into two tiers based on how required they are. Only include a keyword if the candidate GENUINELY HAS it.

TIER 1 — must-have (4–6 keywords): skills/tools explicitly required, repeated multiple times, or foundational to the role. These MUST appear in: the professional summary, the skills section, AND at least one experience bullet.

TIER 2 — preferred (8–15 keywords): skills mentioned once or as "nice to have." These should appear in the skills section and once in the most relevant bullet.

Only hard skills count for the skills section — generic soft-skill clichés ("communication", "team player", "proactive") score nothing in ATS and must never appear.

EXCEPTION — BEHAVIORAL REQUIREMENTS: Some JDs explicitly require verifiable activities that are neither hard-skill tools nor generic personality traits. These vary by industry but share a common pattern — they are specific, observable, and listed under the role's responsibilities or requirements (not just the culture/values section). Examples by industry:
  Technology: code reviews, mentoring developers, technical documentation, on-call ownership
  Healthcare: patient education, interdisciplinary rounds, EHR documentation, care plan review, clinical supervision
  Finance: client reporting, audit review, stakeholder presentations, compliance documentation
  Legal: case documentation, client communication, discovery review, brief preparation
  Any industry: cross-functional collaboration, knowledge sharing, process documentation, performance feedback
When any such activity appears as an explicit requirement in the JD, treat it as Tier 2. At least one experience bullet must demonstrate it, and that bullet must be preserved — never dropped or merged into another bullet.

A candidate "genuinely has" a keyword only if that exact technology appears in their resume. Having a similar or competing tool does not qualify — Zustand is not Redux, Vue is not React, Mocha is not Jest. Never tier a keyword the candidate cannot demonstrate in an interview.
${parsed.skills ? '' : '\nNote: this resume has no skills section — embed keywords naturally within experience bullets only.'}

Also identify SYNONYM PAIRS — where the resume and JD use different words for the same concept. When they naturally fit the same sentence, include both:
  Resume: "localization (i18n)" + JD: "internationalization" → "localization (i18n)"
  Resume: "SQL" + JD: "PostgreSQL" → "PostgreSQL (SQL)"
  Resume: "REST APIs" + JD: "API integrations" → "REST API integrations"

STEP 3 — DEFINE RESUME ANGLE
Write one internal positioning sentence (not output to the resume) that captures how to frame this candidate for the role:
  Format: "[Role archetype] with [X years] of [key experience area] specializing in [top 2 Tier 1 strengths], with proven [most relevant achievement type]."
  Example: "Frontend architect with 3+ years building scalable React/TypeScript products specializing in component libraries and accessible interfaces, with proven ability to own technical decisions from inception."

This angle is the north star — every bullet and the summary must reinforce it.

${includeSummary ? `STEP 4 — WRITE PROFESSIONAL SUMMARY
Write a 2–3 sentence professional summary using the resume angle from STEP 3.

Rules:
- Sentence 1: Identity (role archetype) + 2–3 Tier 1 keywords + years of experience
- Sentence 2: Strongest matching capability or achievement that directly answers the role's core challenge
- Sentence 3 (optional): Full-stack capability, additional differentiator, or collaboration strength relevant to the role
- No first-person pronouns (no "I", "my", "me")
- No weak openers: "Experienced professional...", "Results-driven...", "Dynamic..."
- No clichés: "passionate", "innovative", "team player", "go-getter"
- 40–70 words total
- EVIDENCE RULE: Only claim experience in the summary that is explicitly demonstrated by at least one experience or project bullet. If a technology appears only in the skills section and in no bullet, do not claim the candidate builds, deploys, or specialises in it. Example: Python listed only in skills → summary may NOT say "building production Python applications".` : `STEP 4 — SUMMARY: Skip. Set summary to "".`}

STEP 5 — BULLET BUDGET
${trim
  ? `TRIM MODE is active. For each role, drop any bullet that has no meaningful connection to the target role — skills, industry, or responsibilities that are clearly unrelated. Keep every bullet that demonstrates relevant capability, transferable skills, or role-required experience. Minimum 2 bullets per role — never reduce a role below 2, never remove a role entirely. Do not add new bullets in trim mode.`
  : `Determine bullet count per role. Default: preserve input count exactly. Allowed adjustments (±1 max):
- The role whose experience most directly matches the job requirements: may expand by +1 (write one additional bullet from real experience in that role)
- Roles dated more than 4 years ago OR clearly least relevant to this role type: may compress by −1 (drop the weakest bullet), minimum 2 bullets per role
- All other roles: keep exact input count
- Net change across ALL roles combined must not exceed +1 total new bullet`}

PROJECTS bullet budget: preserve the exact bullet count for every project — do not add or remove any bullets. The ±1 allowance above applies only to experience roles.

STEP 6 — REWRITE BULLETS
Transform every bullet using compressed STAR format:
  [Strong action verb] + [what was done] + [measurable result or concrete scope]

NO MERGING — rewrite each bullet individually. Every input bullet must produce exactly one output bullet. Do not combine two bullets into one sentence. Merging buries content that may directly satisfy a JD requirement — a stakeholder collaboration bullet merged into a Figma bullet loses its keyword surface area and its searchability.

SCOPE PRESERVATION — when rewriting, preserve the nature and depth of the original experience. Do not upgrade a specific or narrow usage into a broader capability claim. Do not apply JD architecture terminology to the resume unless those exact terms appear in the resume — if the JD says "microservice architectures" or "cloud-native" but the resume describes a monolith backend + web frontend, do not adopt those terms:
  "used AWS S3 for media storage" → must NOT become "deployed applications on AWS" or "managed AWS infrastructure"
  "used AWS Bedrock for AI features" → must NOT become "built Python applications on AWS"
  A technology listed only in the skills section with no experience bullet → must NOT appear in any rewritten bullet
The rewrite may strengthen the language and add context, but the underlying scope of what the candidate actually did must remain accurate.

Apply synonym pairs from STEP 2 where they fit naturally — include both the resume's term and the JD's term in the same bullet when they describe the same work.

Choose metrics that fit the detected industry:
- Technology: latency/load time improvements, scale (users, requests/day), uptime %, cost savings ($), build time reduction, team size
- Healthcare: patient outcome scores, caseload volume, error-free record, discharge time, compliance rate
- Finance: dollar values (AUM, deal size, cost savings), compliance scope, audit volume, reporting time reduction
- Marketing: conversion rate, CTR, ROI, audience growth, revenue generated, impressions
- Legal: transaction value, case outcomes, contracts per year, jurisdictions handled

When no real metric exists, use concrete scope instead: team size, number of integrations, user count, timeline. Never make a vague improvement claim without a number.

When rewriting a bullet, use the job description's exact terminology to describe the candidate's matching experience — if the job says "WCAG 2.1 AA" and the candidate has accessibility work, write "WCAG 2.1 AA" rather than just "accessible."

NEVER use these weak openers:
  "Responsible for" → Led / Owned / Managed
  "Worked on" → Built / Developed / Contributed to
  "Helped with" → Partnered / Enabled / Supported
  "Assisted with" → Collaborated / Contributed
  "Was involved in" → Drove / Participated in
  "Demonstrating proficiency in" / "Demonstrating knowledge of" / "Showcasing expertise in" → remove the phrase entirely; the work demonstrates it

Strong action verbs by category:
  Leadership: Led, Owned, Directed, Drove, Spearheaded, Championed, Orchestrated, Pioneered
  Building: Built, Developed, Designed, Launched, Shipped, Engineered, Deployed, Architected
  Improving: Reduced, Improved, Optimized, Streamlined, Accelerated, Refactored, Modernized
  Growth: Grew, Increased, Generated, Scaled, Delivered, Exceeded
  Collaboration: Partnered, Mentored, Advised, Negotiated, Aligned

STEP 7 — REORDER BULLETS
Within each role, sort that role's bullets by relevance to the target job — most relevant first, least relevant last. This applies only to the bullets array inside a single role. The order of roles in the experience array is fixed and must not change.
${step8}
STEP 9 — ATS CONFIDENCE SCORE
After completing all resume edits, assess how well the candidate matches the job requirements.

Score 0–100:
- 85–100: Strong match — nearly all hard requirements met, experience level aligned
- 65–84: Good match — most requirements met, 1–2 notable gaps
- 45–64: Moderate — relevant background but meaningful gaps in skills or experience level
- 25–44: Weak — significant gaps in required skills or years of experience
- 0–24: Poor fit — fundamental mismatch in role type, industry, or seniority

Score honestly. An accurate 58 is more useful to the candidate than a padded 82.

atsGaps: list 2–4 short, specific gaps (≤55 characters each). Hard requirements only — not soft skills. Leave empty [] if the candidate is a strong match.
Examples: "GraphQL not found on resume" / "Requires 7yr experience, candidate has ~3yr" / "AWS cert required but absent"

${compactMode}---

ABSOLUTE RULES — any violation makes the output unusable:

1. NEVER change: name, phone, email, website, job titles, company names, dates, locations, institution names, degree names
1b. NEVER reorder experience entries — the experience array must appear in exactly the same order as the input. Only the bullets within a role may be reordered.
2. NEVER invent OR SUBSTITUTE: every technology name, framework, language, and tool that appears in any bullet OR in the skills string must come from the candidate's resume JSON — not from the job description. If the resume says "PHP (Symfony)" and the JD says "Python/FastAPI", the bullet must say "PHP (Symfony)". Never replace a resume technology with a JD technology even if they serve the same purpose.
   SKILLS VERIFICATION — before writing the final skills string, check every specific tool/library/framework against the candidate's resume JSON. Remove any that do not appear verbatim in the resume. The only permitted additions are: (a) CATEGORY LABELS from STEP 8 (e.g. "State Management", "Testing", "Component Libraries"), and (b) direct supersets/subsets already approved in STEP 8 (e.g. TypeScript if JavaScript is present). Specific tools such as Redux, Jest, Cypress, React Testing Library may NOT be added to skills unless they appear verbatim in the resume — the capability categories rule does not license adding the individual tools, only the category label. Tools that appear ONLY in the JD's preferred or nice-to-have requirements and not in the resume must never be added — even if they seem closely related. Example: JD lists "Infrastructure as Code (Terraform, AWS CDK, or similar)" → do NOT add Terraform or AWS CDK unless they appear verbatim in the candidate's resume.
2b. NEVER fabricate a testing or implementation bullet. If an existing bullet says the candidate provided feedback on or mentored others in automated testing, that is a code review/leadership activity — it does NOT mean the candidate implemented automated tests. Do not write a new bullet claiming the candidate "implemented", "built", or "wrote" tests using a specific framework unless an existing resume bullet explicitly describes that work with that tool.
3. BULLET COUNT — follow the budget set in STEP 5. ${trim ? 'TRIM MODE: drop bullets with no connection to this role; minimum 2 per role; do not add new bullets.' : 'The most relevant role may add 1 bullet (using real experience from that role only). A role 4+ years old or least relevant may drop 1 bullet (minimum 2). Net change across all roles: at most +1 total. All other roles: exact input count.'}${certRule}
3b. NO MERGING (absolute): Every input bullet must become exactly one output bullet. Never combine two bullets into a single sentence. If the budget requires reducing count, drop the weakest bullet entirely — never absorb its content into another bullet. A role with 11 input bullets must produce 10 or 11 output bullets, never 6.
3c. BEHAVIORAL BULLETS PROTECTED: If the JD explicitly names a verifiable collaborative activity under its responsibilities section (e.g. "code reviews", "mentoring", "knowledge sharing", "patient education", "audit review") AND the candidate has a bullet demonstrating that activity, that bullet MUST appear in the output unchanged. It may not be dropped or merged regardless of bullet budget. Drop a different bullet instead.
4. Tech: lines are immutable — any bullet that begins with "Tech:" must be copied character-for-character into the output. Never rephrase, shorten, merge, or omit it. It counts toward the bullet count.
5. NEVER use markdown in any string value — no asterisks, bold, dashes as list markers
6. Return ONLY valid JSON — no explanation, no markdown fences, no text before or after

Return this exact JSON structure:

${buildTailorSchema(parsed)}`
}

export function isValidResume(r: unknown): r is TailoredResume {
  if (!r || typeof r !== 'object') return false
  const resume = r as Record<string, unknown>
  return typeof resume.name === 'string' &&
    typeof resume.email === 'string' &&
    Array.isArray(resume.experience)
}

function parseJson(raw: string): TailoredResume {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('AI returned invalid JSON. Please try again.')
  }
  // Unwrap { resume, atsScore, atsGaps } wrapper; fall back to bare resume object
  const data = parsed as Record<string, unknown>
  const resumeData = (data.resume && typeof data.resume === 'object') ? data.resume : parsed
  if (!isValidResume(resumeData)) throw new Error('AI returned incomplete response. Please try again.')
  const resume = resumeData as TailoredResume
  if (typeof data.atsScore === 'number') resume.atsScore = Math.max(0, Math.min(100, Math.round(data.atsScore)))
  if (Array.isArray(data.atsGaps)) resume.atsGaps = (data.atsGaps as unknown[]).filter((g): g is string => typeof g === 'string')
  return resume
}

export async function tailorResume(
  job: JobData,
  parsed: ParsedResume,
  provider: AIProvider,
  apiKey: string,
  compact = false,
  supplemental?: string,
  trim = false,
  includeSummary = true,
): Promise<TailoredResume> {
  const prompt = buildPrompt(job, parsed, compact, supplemental, trim, includeSummary)

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
        max_tokens: 6000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
      throw new Error(err.error?.message ?? `Claude API error ${res.status}`)
    }
    const data = (await res.json()) as { content: Array<{ type: string; text: string }> }
    const text = data.content.find((b) => b.type === 'text')?.text ?? ''
    return parseJson(text)
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
      max_tokens: 6000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
    throw new Error(err.error?.message ?? `OpenAI API error ${res.status}`)
  }
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> }
  const text = data.choices[0]?.message?.content ?? ''
  return parseJson(text)
}
