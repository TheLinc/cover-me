import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleCors, json } from '../_shared/cors.ts'
import { decrypt, encrypt } from '../_shared/encrypt.ts'
import { findOrCreateJobApplication } from '../_shared/job-application.ts'

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

  const { data: userData } = await supabase
    .from('users')
    .select('tier')
    .eq('id', userId)
    .single()
  const tier = userData?.tier ?? 'hosted_free'

  if (tier === 'hosted_free') {
    const today = new Date().toISOString().split('T')[0]
    const { data: allowed, error: rateError } = await supabase
      .rpc('check_and_increment_rate_limit', {
        p_user_id: userId,
        p_date: today,
        p_limit: FREE_DAILY_LIMIT,
      })
    if (rateError) return json({ error: 'Could not check rate limit. Please try again.' }, 500)
    if (!allowed) {
      return json(
        { error: `You've used all ${FREE_DAILY_LIMIT} free generations for today. Your limit resets at midnight UTC.` },
        429,
      )
    }
  }

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

  let job: { title: string; company: string; description: string }
  let compact = false
  let supplemental: string | undefined
  let trim = false
  let includeSummary = true
  try {
    const body = await req.json()
    job = body.job
    compact = !!body.compact
    supplemental = typeof body.supplemental === 'string' ? body.supplemental.trim() : undefined
    trim = !!body.trim
    includeSummary = body.includeSummary !== false
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  if (!job?.title || !job?.description) {
    return json({ error: 'Missing job title or description' }, 400)
  }

  const company = job.company && job.company !== 'Unknown Company' ? job.company : 'Unknown'
  const today = new Date().toISOString().split('T')[0]

  const compactSection = compact ? `---

COMPACT MODE — SINGLE PAGE REQUIRED:
The output must fit on a single letter page. Apply these additional constraints (they override the general rules where they conflict):
- Reduce to a maximum of 3 bullets per role — keep the most relevant 3, drop the rest. A bullet matching an activity the JD explicitly names (e.g. code reviews) is among the most relevant — keep it.
- Every bullet must fit on a single line (100 characters maximum)
- Shorten the skills string to the 10 most relevant skills only
- The bullet budget rule (STEP 5) does NOT apply in compact mode — use these constraints instead
- The summary may be omitted in compact mode if space is critical

` : ''

  const prompt = `You are an expert resume writer and ATS optimization specialist. Tailor the candidate's resume for the specific job below by rewriting content — never fabricating it.

TODAY'S DATE: ${today}
TARGET ROLE: ${job.title}
COMPANY: ${company}

JOB DESCRIPTION:
${job.description.slice(0, 4000)}

CANDIDATE RESUME (raw text extracted from the candidate's actual resume):
${resumeText.slice(0, 6000)}
${supplemental ? `
SUPPLEMENTAL CANDIDATE CONTEXT (verified by the candidate — real experience not captured in the resume above):
${supplemental}

Use this context to strengthen existing bullets where the experience is relevant and accurate. Do not add bullet entries beyond the budget set in STEP 5 — weave the context into the most applicable existing bullets.
` : ''}
---

PROCEDURE — follow in order:

STEP 1 — DETECT INDUSTRY
Identify the industry from the JD vocabulary; it sets which keywords and metrics matter:
- Technology: API, CI/CD, deploy, stack, backend, frontend, cloud, framework, repo
- Healthcare: EHR/EMR, HIPAA, BLS/ACLS, patient care, clinical, nursing, physician
- Finance: AUM, CFA, CPA, GAAP, SOX, portfolio, deal, equity, audit
- Marketing: campaign, CTR, CPC, funnel, A/B test, brand, conversion, ROAS
- Legal: jurisdiction, litigation, deposition, discovery, counsel, contract
- Other: infer the field's own hard-skill vocabulary and outcome metrics directly from the JD.

STEP 2 — EXTRACT & TIER KEYWORDS
Pull the hard requirements from the JD and tier them. Only tier a keyword the candidate GENUINELY HAS (Integrity 3).
- TIER 1 — must-have (4–6): explicitly required, repeated, or foundational. Must appear in the summary, the skills, AND at least one bullet.
- TIER 2 — preferred (8–15): mentioned once or "nice to have." Appear in skills and in the most relevant bullet.
Only hard skills — soft-skill clichés ("communication", "team player", "proactive") score nothing and never appear in skills.

BEHAVIORAL REQUIREMENTS — when the JD names a verifiable activity under its responsibilities (not its culture blurb) and a bullet already demonstrates it, treat it as Tier 2 and protect that bullet (Integrity 6). These are industry-specific:
  Tech: code reviews, mentoring, technical documentation, on-call ownership
  Healthcare: patient education, interdisciplinary rounds, care-plan review, clinical supervision
  Finance: client reporting, audit review, stakeholder presentations
  Legal: discovery review, client communication, brief preparation
  Any: cross-functional collaboration, knowledge sharing, process documentation

SYNONYM PAIRS — when the resume and JD name the same thing differently and both fit one phrase, keep both: "localization (i18n)"; "PostgreSQL (SQL)"; "REST API integrations".

STEP 3 — DEFINE RESUME ANGLE
Write one internal positioning sentence (not output): "[Role archetype] with [X years] of [key area] specializing in [top 2 Tier 1 strengths], with proven [achievement type]." Every bullet and the summary must reinforce it.

${includeSummary ? `STEP 4 — WRITE SUMMARY
2–3 sentences, 40–70 words, no first-person pronouns, no weak openers ("Experienced professional", "Results-driven", "Dynamic"), no clichés ("passionate", "innovative", "team player"):
- Identity: open with the target role's title (TARGET ROLE above) as the archetype, unless the candidate's experience clearly does not support that level — then use the closest archetype it does support. Include 2–3 Tier 1 keywords and years of experience.
- Strongest capability or achievement that answers the role's core challenge
- Optional: a differentiator or collaboration strength relevant to the role
YEARS OF EXPERIENCE: state only what the resume's employment dates support (earliest start date to today). Never round up or inflate to match the job's stated minimum — if the dates support 3 years and the JD asks for 5, write 3, not 5. If unsure, omit the number entirely.
Claim only what a bullet demonstrates — a skills-only technology may not be claimed as built/deployed/specialised in, and architecture buzzwords the resume does not support are forbidden (Integrity 4).
INDUSTRY/DOMAIN: name a domain (e-commerce, fintech, biotech, etc.) ONLY if a bullet shows the candidate actually worked in it. Never borrow a domain from the JD's requirements or "nice-to-have" list, and never hedge an unearned one in with "-adjacent", "-aligned", or "cross-domain" (Integrity 4).` : `STEP 4 — SUMMARY: skip; set summary to "".`}

STEP 5 — BULLET BUDGET
${trim
  ? `TRIM MODE — RANK, THEN CUT: judging each bullet alone fails — in a strong resume almost every bullet looks individually "relevant," which is why nothing gets dropped. Instead RANK each role's bullets by relevance to THIS JD and keep only the strongest: a role with 8+ input bullets keeps the 5–7 most relevant and drops the rest; a role with 5–7 keeps 4–5; a role with 4 or fewer keeps at least 2. Cutting a long role to roughly half is the EXPECTED result, not an edge case. Drop first the bullets in a tech stack or domain the JD never names (e.g. a React Native / mobile bullet for a web role; a payments or CRM-integration bullet for a role about neither), then filler with no JD keyword and no concrete outcome. NEVER drop a bullet matching an activity the JD explicitly names (code reviews, mentoring, stakeholder communication — Integrity 6), and never drop the only evidence of a Tier 1 keyword. Never remove a role; never add or merge bullets — only drop whole ones.`
  : `DEFAULT MODE — STRICT 1:1: rewrite EVERY input bullet into exactly one output bullet. Each role's output bullet count MUST equal its input count exactly — no drops, no additions, no merges. Count the input bullets in each role first; if a role has 11 input bullets, output exactly 11. This is mandatory, not a target.`}
PROJECTS: preserve every project's bullet count exactly, and never drop a technology named in a project.

STEP 6 — REWRITE BULLETS
Compressed STAR: [strong action verb] + [what was done] + [measurable result or concrete scope]. Reword for impact and ATS phrasing without changing what actually happened (Integrity 3–5).
- Use the JD's exact term for matching work — if the JD says "WCAG 2.1 AA" and the candidate did accessibility work, write "WCAG 2.1 AA", not just "accessible". Apply STEP 2 synonym pairs where they fit.
- Borrow the JD's vocabulary, not its sentences: keep the JD's specific terms-of-art (per above), but never reproduce a whole sentence or clause from the JD — phrase every accomplishment in the candidate's own words. Lifted phrasing reads as templated to a human reviewer.
- Quantify with industry-fit metrics — Tech: latency, scale, uptime, cost, build time; Healthcare: caseload, outcomes, error-free records, compliance; Finance: $ value, audit volume, reporting time; Marketing: conversion, CTR, ROI, revenue; Legal: transaction value, case outcomes, caseload. No real metric? Use concrete scope (team size, user count, integrations, timeline). Never a vague improvement with no number. Use each specific figure once — never repeat the same metric across bullets; the summary may cite at most one headline number.
- Replace weak openers: Responsible for→Led/Owned; Worked on→Built/Developed; Helped/Assisted with→Partnered/Collaborated; "Demonstrating proficiency in"→delete (the work shows it).
- Verb bank: Led, Owned, Drove, Spearheaded, Built, Designed, Launched, Shipped, Architected, Reduced, Optimized, Streamlined, Scaled, Generated, Delivered, Partnered, Mentored.

STEP 7 — REORDER BULLETS
Within each role, sort bullets most-relevant-first. This touches only the bullets inside a role; role order is fixed (Integrity 2).

STEP 8 — OPTIMIZE SKILLS
Reorder the skills so the most relevant to this job appear first, using the JD's exact phrasing where it differs from the resume.

ADD a skill only when it is in the JD AND justified by the resume in one of two ways:
  - Direct superset/subset of an existing skill — JavaScript on resume + JD says TypeScript → add TypeScript.
  - A capability CATEGORY LABEL you can back with a SPECIFIC tool already on the resume — Zustand on resume + JD says "state management" → add "State Management"; Jest/RTL on resume + JD says "testing" → add "Testing". Before adding any label, name the resume tool that justifies it; if you cannot name one, do not add it. Add the label only, never the specific JD tool itself (Integrity 3).
Never add a competing or unrelated tool the candidate lacks (Vue, Redux, a different language). Do NOT add process or architecture buzzwords the resume gives no concrete evidence for — in tech, "CI/CD", "DevOps", "Cloud Security", "Microservices Architecture", "Cloud-Native" each require a named tool or practice on the resume; in any field, a license, certification, or method named only in the JD is never added unless the resume states it. Absent evidence, these are fabrications (Integrity 4). If in doubt, leave it out.

REMOVE skills not relevant to this role type (e.g. a mobile-only framework for a pure web role). When over the cap, keep the most JD-relevant skills and drop the least relevant first. Aim for ~15–18 focused skills, not an exhaustive inventory; a bloated list buries the terms that matter and reads as unfocused. NEVER remove a skill the JD names — or a specific instance of a category the JD names (e.g. MySQL under "relational databases") — that the candidate genuinely has; ATS matches literal tokens, so the JD's exact term must survive. When the resume has both a JD-named specific term and its generic synonym, keep BOTH ("MySQL (SQL)", not just "SQL"); dedupe only synonyms the JD does not name. Hard cap: 18 items.

STEP 9 — ATS CONFIDENCE SCORE
Score 0–100 honestly (an accurate 58 beats a padded 82): 85–100 strong, 65–84 good (1–2 gaps), 45–64 moderate, 25–44 weak, 0–24 poor fit.
atsGaps: 2–4 specific hard-requirement gaps (≤55 chars each), e.g. "GraphQL not on resume" / "Requires 7yr, candidate ~3yr". Empty [] if a strong match.

${compactSection}---

INTEGRITY RULES — any violation makes the output unusable:

1. NEVER alter: name, contact details, job titles, company names, dates, locations, institutions, degree names, certifications, or any bullet beginning "Tech:" (copy those verbatim — they count toward the bullet budget).
2. NEVER reorder experience or education entries. Output every entry in the EXACT top-to-bottom order it appears in the input — do NOT re-sort by date, recency, relevance, or seniority. If the input lists role A above role B, the output lists A above B, even when B's start date is more recent or B seems more relevant to this job. Only the bullets WITHIN an entry may be reordered.
3. NO INVENTED OR SUBSTITUTED SKILLS. Any concrete skill, tool, technology, certification, license, method, or system may appear in the output (bullets or skills) only if it appears verbatim in the resume. A competing or adjacent one does NOT qualify the candidate for the one the JD names — this holds in every field: Zustand≠Redux, Vue≠React (tech), BLS≠ACLS (healthcare), QuickBooks≠SAP (finance), M&A≠litigation (legal). JD-only items — including "preferred"/"nice-to-have" ones — are never added. Never swap something the resume names for a different thing the JD names even when they serve the same purpose (resume "PHP (Symfony)" stays "PHP (Symfony)" even if the JD says "Python/FastAPI"). The only additions allowed are those defined in STEP 8.
4. NO SCOPE INFLATION. Keep each bullet's real depth — never upgrade narrow, specific work into a broad claim. This applies in every field: "used AWS S3 for storage" must not become "deployed on AWS" (tech); "recorded patient vitals" must not become "managed critical care" (healthcare); "reconciled invoices" must not become "owned the financial close" (finance). Don't apply a JD term-of-art unless the resume gives concrete evidence for it — in tech that means "microservices", "cloud-native", "CI/CD", "DevOps", "cloud security"; in other fields, the equivalent inflated label. This ban includes hedged or hyphenated variants ("microservice-aligned", "X-aligned", "X-inspired", "X-adjacent") — you may not evade it by softening the word. It also covers INDUSTRY/DOMAIN claims: if no bullet shows the candidate worked in a domain (e-commerce, fintech, healthcare, etc.), the summary and bullets may not claim it or call the experience "X-adjacent", even when the JD lists that domain as required or preferred. A skill listed only in the skills section (no supporting bullet) may never appear in a bullet or the summary. Do not manufacture an accomplishment from a supervisory mention — "reviewed others' work" does not license claiming you performed that work.
5. ONE BULLET IN, ONE BULLET OUT (NO MERGING). Never merge two bullets into one sentence — to shorten a role, drop whole bullets, never fuse them. In DEFAULT mode each role's output bullet count equals its input count EXACTLY (11 in → 11 out, no drops). In TRIM or COMPACT mode, dropping whole bullets is REQUIRED per STEP 5 — a long role is expected to come out roughly half its input length — but the surviving bullets are still strictly one-in-one-out (never a JD-named activity, never merged).
6. PROTECT BEHAVIORAL BULLETS. If the JD names a verifiable activity under its responsibilities (STEP 2) and a bullet demonstrates it, that bullet must appear in the output — never dropped or merged, regardless of budget. Drop a different bullet instead.
7. OPTIONAL SECTIONS — only include a field if that section exists in the candidate's resume. No projects → output "projects": []. No skills → output "skills": "". Never fabricate content for a section the resume lacks.
8. Return ONLY valid JSON — no markdown anywhere in values, no fences, no text before or after.

FINAL CHECK — before emitting, SILENTLY audit your draft against the rules above and fix every violation. Do NOT write the audit, reasoning, or any commentary; your entire response must be the JSON object only, starting with { and ending with }. Verify:
- NO MERGING: no output bullet combines two distinct accomplishments from separate input bullets. To shorten a role, drop whole bullets per the active budget — never fuse them. If any bullet joins two unrelated accomplishments with ";" or "and also", split it back.
- BEHAVIORAL MATCH: every activity the JD names under its responsibilities that the resume supports (e.g. code reviews, mentoring) appears as its own bullet.
- EVIDENCE: every skill, credential, and claim in a bullet or the summary is backed verbatim by the resume. Remove anything that is not — especially a term-of-art lifted from the JD that the resume never supports (in tech: CI/CD, DevOps, Microservices; in any field, the equivalent unearned buzzword).

Return this exact JSON structure:

{
  "resume": {
    "name": "string",
    "phone": "string",
    "email": "string",
    "website": "string",
    "summary": "string — 2-3 sentence professional summary, no first-person pronouns",
    "experience": [
      {
        "title": "string",
        "company": "string",
        "location": "string",
        "dates": "string",
        "bullets": ["string"]
      }
    ],
    "projects": [
      {
        "name": "string",
        "bullets": ["string"]
      }
    ],
    "education": [
      {
        "institution": "string",
        "degree": "string",
        "location": "string",
        "dates": "string",
        "bullets": ["string"]
      }
    ],
    "skills": "string"
  },
  "atsScore": "number (0-100)",
  "atsGaps": ["string — one specific gap per item"]
}`

  // Debug — OFF by default. Logs PII (resume + prompt) to the function logs.
  // Enable only for local/staging:  supabase secrets set DEBUG_MODE=true
  // View with:  supabase functions logs tailor
  const DEBUG = Deno.env.get('DEBUG_MODE') === 'true'
  if (DEBUG) {
    console.log('[CoverMe debug] job:', JSON.stringify(job))
    console.log('[CoverMe debug] flags:', JSON.stringify({ compact, trim, includeSummary, hasSupplemental: !!supplemental }))
    console.log('[CoverMe debug] resumeText (input to model):\n', resumeText)
    console.log('[CoverMe debug] full prompt sent to model:\n', prompt)
  }

  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      // Sonnet for tailoring: judgment-heavy (bullet preservation, relevance
      // calls) — Haiku compresses/merges. Cover letters stay on Haiku.
      model: 'claude-sonnet-4-6',
      max_tokens: 6000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!claudeRes.ok) {
    console.error('Claude error:', await claudeRes.text())
    return json({ error: 'AI generation failed. Please try again.' }, 502)
  }

  const claudeData = await claudeRes.json() as { content: Array<{ type: string; text: string }> }
  const raw = claudeData.content.find((b) => b.type === 'text')?.text ?? ''
  if (DEBUG) console.log('[CoverMe debug] raw model response:\n', raw)
  let cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  // If the model wrapped the JSON in prose, extract the outermost object.
  if (!cleaned.startsWith('{')) {
    const first = cleaned.indexOf('{')
    const last = cleaned.lastIndexOf('}')
    if (first !== -1 && last > first) cleaned = cleaned.slice(first, last + 1)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return json({ error: 'AI returned invalid response. Please try again.' }, 502)
  }

  // Unwrap { resume, atsScore, atsGaps } wrapper; fall back to bare resume
  const data = parsed as Record<string, unknown>
  const resumeData = (data.resume && typeof data.resume === 'object') ? data.resume : parsed
  const atsScore = typeof data.atsScore === 'number'
    ? Math.max(0, Math.min(100, Math.round(data.atsScore)))
    : undefined
  const atsGaps = Array.isArray(data.atsGaps)
    ? (data.atsGaps as unknown[]).filter((g): g is string => typeof g === 'string')
    : undefined

  // Embed score fields into the resume object so they persist with history
  const resume = resumeData as Record<string, unknown>
  if (atsScore !== undefined) resume.atsScore = atsScore
  if (atsGaps !== undefined) resume.atsGaps = atsGaps

  // Persist for Pro users — non-fatal if it fails
  if (tier === 'hosted_pro') {
    try {
      const jobAppId = await findOrCreateJobApplication(supabase, userId, job)
      const resume_json_encrypted = await encrypt(JSON.stringify(resume))
      await supabase.from('tailored_resumes').insert({
        user_id: userId,
        job_application_id: jobAppId,
        resume_json_encrypted,
        ats_score: atsScore ?? null,
        ats_gaps: atsGaps ?? null,
      })
    } catch {
      console.error('Failed to persist tailored resume')
    }
  }

  return json({ resume })
})
