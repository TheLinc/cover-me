// How a posting's keywords are picked and judged for the ATS score. The tailor
// (extension and hosted) and the website's ATS checker use this same text, so
// one resume and posting score the same everywhere (#278). Mirrored
// byte-for-byte: extension/src/lib/ai/keyword-rules.ts ⇄
// backend/supabase/functions/_shared/keyword-rules.ts, checked by scripts/check-prompt-sync.mjs.

export const KEYWORD_TIERS = `Pull the hard requirements from the JD and tier them:
- TIER 1 — must-have (4–6): explicitly required, repeated, or foundational.
- TIER 2 — preferred (8–15): mentioned once or "nice to have."
A keyword is a hard skill, tool, system, certification, license, degree, method, or regulation the JD asks for, named in the JD's own words (1–4 words). List each requirement once. Leave out:
- soft-skill clichés ("communication", "team player", "proactive"): they score nothing
- years of experience: they are gating gaps, never keywords
- the employer's own name and products, benefits, pay, schedule, location
- equal-opportunity, accommodation, and other legal text
- words too general to act on ("warehouse", "logistics", "healthcare")

BEHAVIORAL REQUIREMENTS — a verifiable activity the JD names under its responsibilities (not its culture blurb) is a Tier 2 keyword. These are industry-specific:
  Tech: code reviews, mentoring, technical documentation, on-call ownership
  Healthcare: patient education, interdisciplinary rounds, care-plan review, clinical supervision
  Finance: client reporting, audit review, stakeholder presentations
  Legal: discovery review, client communication, brief preparation
  Any: cross-functional collaboration, knowledge sharing, process documentation

ALTERNATIVE REQUIREMENTS — when the JD offers a choice ("X, Y, or Z"; "SQL/NoSQL"; "relational or non-relational"; "a bachelor's degree or equivalent experience"), treat the whole set as ONE requirement that is covered if the candidate has ANY one member. Tier it once, by the member the candidate has, or by all its options when the candidate has none ("Tableau or Power BI"). NEVER list the unused alternatives as missing or as a gap — they are not required.`

export const KEYWORD_JUDGING = `Judge coverage ONLY against this JD: the Tier 1 and Tier 2 keywords, plus the qualifications the JD explicitly states. NEVER weigh skills the JD does not mention, or skills "typically"/"usually" expected for this kind of role — if it is not in this JD, it neither helps nor hurts the candidate.
A keyword is covered when the resume, or context the candidate verified, shows the candidate has it. Judge by meaning, not spelling. These count as covered:
- an abbreviation or the full name: "GD&T" and "Geometric Dimensioning and Tolerancing", "CDL" and "commercial driver's license"
- a degree written short: "B.S., Accounting" is a bachelor's degree, and an accounting degree
- singular and plural, verb and noun: "scheduling" and "schedules appointments"
- a number that meets the JD's threshold: "managed $46M projects" meets "$20M+ projects"
- a named instance of a category the JD asks for: "NetSuite" is an ERP system, "Jest" is unit testing
- work the resume describes that plainly is the named activity: "trained 12 new hires on the line" shows training staff
- for an alternative requirement, any one of its options
These do not:
- a different product, version, or level, even one that does the same job: HubSpot≠Salesforce, OSHA 10≠OSHA 30, BLS≠ACLS, a Class B license≠Class A
- a general skill for a specific one the JD names: "reconciled accounts" doesn't show "bank reconciliations"; the specific thing has to be on the resume
- something the candidate is learning, pursuing, or plans to get
- a skill the resume never shows, however likely it seems for someone with this background
Before you mark a keyword missing, read the whole resume again for it in other words: the summary, every bullet, the skills, education, and certifications.

GATING GAPS — hard qualifications the JD explicitly requires that the candidate does not meet: years of experience, a required degree, a mandatory license or certification (≤55 chars each). For a years requirement, total the dates of the roles that did that kind of work, rounded down to whole years, and report it only when short: "Requires 4yr, candidate ~2yr". When the gap is also a missing keyword, start it with that keyword's exact name: "OSHA 30: candidate has OSHA 10". A "preferred"/"nice-to-have" item is a Tier 2 keyword, never a gating gap.`
