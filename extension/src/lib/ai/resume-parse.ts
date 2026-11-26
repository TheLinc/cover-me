import type { AIProvider, ParsedResume } from '../../types'
import { claudeDelta, HAIKU_PARSE_FIELDS, readSseText } from './claude'
import { OPENAI_CHAT, OPENAI_PARSE_FIELDS } from './openai'

const CLAUDE_API = 'https://api.anthropic.com/v1/messages'

// The most resume text a prompt carries, own-key and signed in alike. A long
// master resume (three pages, fifteen bullets a role) runs about 13,000
// characters, and a cut drops whatever comes last, usually education.
// 20,000 covers 99% of stored resumes while keeping the parse well
// inside its output limit (#190).
export const MAX_RESUME_CHARS = 20000

export function buildParsePrompt(resumeText: string): string {
  return `You are a resume parser. Convert the resume text below into structured JSON.

RULES:
1. Copy all text verbatim — do not rephrase, summarize, or improve any content. A URL written in a section stays in the text it was written in: a project name, a job, degree or certification line, a bullet, or a line of an extra section
2. Only include these optional fields when the matching section is actually present in the resume:
   - "projects": only if the resume has a personal projects, side projects, portfolio, or open source section
   - "skills": only if the resume has a skills, technical skills, or core competencies section
   - "certifications": only if the resume has a certifications, licenses, or credentials section
3. Recognize experience headers: Work Experience, Professional Experience, Employment, Career History. A section of jobs, each a position held at an employer, is experience under any heading (Clinical Experience, Work History, Relevant Experience)
4. Recognize education headers: Education, Academic Background, Degrees. A section of schooling, each a degree, diploma or apprenticeship at a school or training provider, is education under any heading (Training, Academic Training)
5. "headline": the professional title line printed directly under the name, if any ("Registered Nurse", "Applied AI Engineer"), copied verbatim; "" when the resume has none. Never a job title taken from the experience section
6. "projects": copy each project's URL into "link" and a line listing its technologies into "tech", verbatim, instead of putting them in the name or the bullets; "" when absent
7. "otherSections": every other section goes here, in the order it appears: publications, volunteer work, clinical rotations or placements, awards, languages, memberships, interests, references, and anything else. Copy the heading exactly as written and each line or bullet verbatim, without its bullet marker. Volunteer roles and student clinical rotations, placements, practicums or clerkships go here even when they are laid out like jobs, with titles, organizations and dates; a paid position stays in experience, and so does student teaching, which schools read as teaching experience. Never put contact details or a summary, profile or objective here; the summary is not part of the output. A list of tools, software or programming languages belongs in "skills". Use [] when the resume has no other sections. When a section is made of entries, each a name with lines such as a role, placing, issuer, date or URL and then bullets (awards and honors, publications or presentations with details, competitions, open-source packages, hackathons), give it "entries" instead of "lines": the name, the role or placing line as "subtitle", any URL as "link", any date as "dates", and the bullets verbatim. Lines that are not part of an entry go in "lines"
8. "sectionOrder": the resume's sections from top to bottom, one entry each: "experience", "projects", "education", "certifications" or "skills" for those sections, and "other" for each entry of "otherSections", where it sits. Leave out the contact details and the summary
9. Return ONLY valid JSON — no explanation, no markdown fences, no text before or after
JSON structure (omit "projects", "skills", "certifications" entirely if those sections do not exist in the resume):
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "phone number or empty string if absent",
  "location": "the candidate's own city or region from the contact details, or empty string if absent",
  "website": "the first URL in the contact details, or empty string if absent",
  "headline": "professional title line under the name, or empty string if absent",
  "links": ["every URL in the contact details at the top (website, LinkedIn, GitHub, portfolio), copied verbatim in the order written. A URL written under a project goes in that project's \"link\"; one under a job or section stays in that entry's text, verbatim; neither goes here"],
  "experience": [
    {
      "title": "the job title as written",
      "company": "the employer's name only, as written",
      "location": "the job's city and region, kept out of title and company",
      "dates": "the dates as written, in the resume's own format",
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
      "institution": "the school's name only, as written",
      "degree": "the whole qualification line as written, with its major, subjects, grades and honours",
      "location": "the school's city and region, kept out of institution and degree",
      "dates": "the dates as written, in the resume's own format",
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
  ],
  "sectionOrder": ["certifications", "experience", "other", "education", "skills"]
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

// ── Parse normalizers (mirrored: extension/src/lib/ai/resume-parse.ts ⇄ backend/supabase/functions/_shared/resume-parse.ts) ── #149
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

// A URL without its protocol, www. and trailing slash, lowercased: how two
// copies of one link are compared (#236).
export function urlCore(url: string): string {
  return url.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/(?<!\/)\/+$/, '')
}

const squashed = (s: unknown) => (typeof s === 'string' ? s.toLowerCase().replace(/\s+/g, ' ').trim() : '')

// The parse's section entries' strings, squashed: their verbatim text, but not
// the contact details, job titles (a tagline under the name often repeats
// one), dates, locations or extra-section headings (#236).
function entryStrings(parsed: ParsedResume): string[] {
  const entries = [
    parsed.experience.map((e) => [e?.company, e?.bullets]),
    (parsed.projects ?? []).map((p) => [p?.name, p?.link, p?.tech, p?.bullets]),
    parsed.education.map((e) => [e?.institution, e?.degree, e?.bullets]),
    parsed.certifications ?? [],
    parsed.skills,
    (parsed.otherSections ?? []).map((o) => [o?.lines, (o?.entries ?? []).map((e) => [e?.name, e?.link, e?.bullets])]),
  ]
  return entries.flat(3).map(squashed).filter((s) => s.length >= 3)
}

// A LinkedIn or GitHub profile, which is a contact link wherever it sits: a
// two-column PDF can put its contact sidebar after the first section (#236).
const PROFILE_URL = /^(?:[a-z]{2}\.)?linkedin\.com\/in\/[^/]+$|^github\.com\/[^/]+$/

// A test of whether the resume text first shows a URL inside a section
// (#236): at or after the first copy of an entry's string, the text squashed.
// Never for a profile URL, or one the text lacks. A short string can still
// turn up in the header ("git" in github.com), so this alone shouldn't drop a
// link.
function sectionUrlTest(parsed: ParsedResume, resumeText: string): (url: string) => boolean {
  const text = squashed(resumeText)
  const start = Math.min(...entryStrings(parsed).map((s) => text.indexOf(s)).filter((i) => i !== -1))
  return (url) => {
    const core = urlCore(url)
    const at = text.indexOf(core)
    return at !== -1 && at >= start && !PROFILE_URL.test(core)
  }
}

export function shownInSection(parsed: ParsedResume, resumeText: string, url: string): boolean {
  return sectionUrlTest(parsed, resumeText)(url)
}

// Every contact-line URL, with website first and set, so a build that prints
// only website (the store's before #129) still shows one. Left off when the
// model gives none: renderers then fall back to website. Given the resume
// text, a URL it first shows inside a section (a project's, a job's), and that
// the parse copies into an entry, is dropped (#236), as the contact line
// prints every link; when all are, links is [] and website "". One the
// entries don't hold is kept, so none is lost.
export function withLinks<T extends ParsedResume>(parsed: T, resumeText?: string): T {
  const raw = (parsed as { links?: unknown }).links
  let links = (Array.isArray(raw) ? raw : []).filter((l): l is string => typeof l === 'string' && l.trim().length > 0).map((l) => l.trim())
  const website = typeof parsed.website === 'string' ? parsed.website.trim() : ''
  if (website && !links.includes(website)) links.unshift(website)
  if (resumeText && links.length) {
    const inSection = sectionUrlTest(parsed, resumeText)
    const strings = entryStrings(parsed)
    const contact = links.filter((l) => {
      const core = urlCore(l)
      return !inSection(l) || !strings.some((s) => s.includes(core))
    })
    if (!contact.length) return { ...parsed, website: '', links: [] }
    links = contact
  }
  return links.length ? { ...parsed, website: links.includes(website) ? website : links[0]!, links } : parsed
}
// The headline and each project's link and tech line, kept only when the
// model found them: an empty string would print an empty line or a stray "|" (#190).
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

function sectionsPresent(parsed: ParsedResume): Record<string, boolean> {
  return {
    experience: parsed.experience.length > 0,
    projects: Array.isArray(parsed.projects) && parsed.projects.length > 0,
    education: parsed.education.length > 0,
    certifications: Array.isArray(parsed.certifications) && parsed.certifications.length > 0,
    skills: typeof parsed.skills === 'string' && parsed.skills.trim().length > 0,
  }
}

// Where the resume's sections sit in its text (#165). The parse model often
// lists them in its JSON's order (experience, projects, education, skills)
// rather than the resume's, so each section the parse has is found by its own
// verbatim copies instead: each line of the text counts for the section whose
// strings cover most of it, and a section sits at its best-covered line. null
// when a section can't be found, so the model's order stands.
export function sectionOrderFromText(parsed: ParsedResume, resumeText: string): NonNullable<ParsedResume['sectionOrder']> | null {
  const norm = squashed
  const strings = (xs: unknown[]) => xs.flat(2).map(norm).filter((s) => s.length >= 3)
  const present = sectionsPresent(parsed)
  const sections: Array<{ key: NonNullable<ParsedResume['sectionOrder']>[number]; strings: string[] }> = [
    { key: 'experience' as const, strings: strings(parsed.experience.map((e) => [e?.title, e?.company, e?.bullets])) },
    { key: 'projects' as const, strings: strings((parsed.projects ?? []).map((p) => [p?.name, p?.bullets])) },
    { key: 'education' as const, strings: strings(parsed.education.map((e) => [e?.institution, e?.degree, e?.bullets])) },
    { key: 'certifications' as const, strings: strings(parsed.certifications ?? []) },
    { key: 'skills' as const, strings: strings(typeof parsed.skills === 'string' ? parsed.skills.split(/[,;•|\n]/) : []) },
  ].filter((s) => present[s.key])
  for (const o of parsed.otherSections ?? []) sections.push({ key: 'other', strings: strings([o.heading, o.lines, (o.entries ?? []).map((e) => [e?.name, e?.subtitle, e?.bullets])]) })

  // A string inside the line counts its length; a line inside a longer string
  // (a bullet the text wraps) counts the line's (#165).
  const cover = (line: string, ss: string[]) => ss.reduce((n, s) => n + (line.includes(s) ? s.length : line.length >= 12 && s.includes(line) ? line.length : 0), 0)
  const best = sections.map(() => ({ line: -1, score: 0 }))
  resumeText.split('\n').map(norm).forEach((line, i) => {
    if (line.length < 3) return
    const scores = sections.map((s) => cover(line, s.strings))
    const top = Math.max(...scores)
    const k = scores.indexOf(top)
    // A tie could be either section's line (#165).
    if (top > 0 && scores.lastIndexOf(top) === k && top > best[k]!.score) best[k] = { line: i, score: top }
  })
  if (best.some((b) => b.line < 0)) return null
  return sections.map((s, i) => ({ key: s.key, line: best[i]!.line })).sort((a, b) => a.line - b.line).map((s) => s.key)
}

// The order the resume's sections sat in (#165), which the layouts print
// them in: each standard section the parse has, once, and an "other" for each
// extra section at most. The tailor writes the summary, so it leads. Taken
// from the resume text when given (sectionOrderFromText), else the model's.
// Always an array, [] when nothing valid is left: the tailor treats a cached
// parse without one as made before the order was kept, and parses again. Run
// after withOtherSections, which settles the number of extra sections.
export function withSectionOrder<T extends ParsedResume>(parsed: T, resumeText?: string): T & { sectionOrder: NonNullable<ParsedResume['sectionOrder']> } {
  const raw = (resumeText ? sectionOrderFromText(parsed, resumeText) : null) ?? (parsed as { sectionOrder?: unknown }).sectionOrder
  const unplaced = sectionsPresent(parsed)
  let others = Array.isArray(parsed.otherSections) ? parsed.otherSections.length : 0
  const order: NonNullable<ParsedResume['sectionOrder']> = []
  for (const key of Array.isArray(raw) ? raw : []) {
    if (key === 'other') {
      if (others > 0) {
        others--
        order.push(key)
      }
    } else if (typeof key === 'string' && unplaced[key] === true) {
      unplaced[key] = false
      order.push(key as (typeof order)[number])
    }
  }
  return { ...parsed, sectionOrder: order.length ? ['summary', ...order] : [] }
}

// A model's parse, valid, made ready to store and tailor from. linksKept
// marks it as made since a URL under a section stays in its entry (#238).
function normalizedParse(parsed: ParsedResume, resumeText?: string): ParsedResume {
  return { ...withDetails(withSectionOrder(withLinks(withOtherSections(parsed), resumeText), resumeText)), linksKept: true }
}

type OrderedParse = ParsedResume & Required<Pick<ParsedResume, 'otherSections' | 'sectionOrder'>>

// A parse made since extra sections (#54) and section order (#165) were
// kept, which a chosen order (#197) can be saved on.
export function hasSectionOrder(parsed: ParsedResume | null | undefined): parsed is OrderedParse {
  return Array.isArray(parsed?.otherSections) && Array.isArray(parsed?.sectionOrder)
}

// A cached parse made since then and since the link fix (#238). One from
// before is parsed again, once.
export function isCurrentParse(parsed: ParsedResume | null | undefined): parsed is OrderedParse {
  return hasSectionOrder(parsed) && parsed.linksKept === true
}

// What replaces a cached parse that isn't current, given a fresh parse of the
// same text: the fresh one, as only the model call reads a URL under a
// section into its entry (#238). It keeps the order the user chose in the
// editor (#197), from a cached parse that has an order.
export function upgradedParse(cached: ParsedResume | null | undefined, fresh: ParsedResume): ParsedResume {
  return hasSectionOrder(cached) ? withChosenOrder(fresh, cached.sectionOrder, cached.otherSections.map((o) => o.heading)) : fresh
}

// The parse with the section order the user chose in the editor (#197).
// order: a tailored resume's sectionOrder with its deleted sections put back;
// headings: its extra sections' headings, in that order. Each extra section
// is matched to the parse's by heading, then by place, so moves between them
// carry over. A section the order leaves out goes back to its old index.
export function withChosenOrder<T extends ParsedResume>(parsed: T, order: unknown, headings: unknown): T & { sectionOrder: NonNullable<ParsedResume['sectionOrder']> } {
  const norm = (s: unknown) => (typeof s === 'string' ? s.trim().toLowerCase() : '')
  const own = Array.isArray(parsed.otherSections) ? parsed.otherSections : []
  const left = own.map((_, i) => i)
  const named = (Array.isArray(headings) ? headings : []).map((h) => {
    const i = left.find((j) => norm(own[j]!.heading) === norm(h))
    if (i === undefined) return -1
    left.splice(left.indexOf(i), 1)
    return i
  })
  const placed = named.map((i) => (i >= 0 ? i : left.shift())).filter((i): i is number => i !== undefined)
  const otherSections = [...placed, ...left].map((i) => own[i]!)
  const keys: unknown[] = Array.isArray(order) ? [...order] : []
  let others = keys.filter((k) => k === 'other').length
  for (const [i, k] of (parsed.sectionOrder ?? []).entries()) {
    if (k === 'other' ? others-- > 0 : keys.includes(k)) continue
    keys.splice(Math.min(i, keys.length), 0, k)
  }
  // withSectionOrder puts the summary first, as a parse has it, and drops what
  // the parse lacks. The user may have moved the summary: it goes after the
  // sections kept from those above it (#197).
  const { sectionOrder } = withSectionOrder({ ...parsed, otherSections, sectionOrder: keys as ParsedResume['sectionOrder'] })
  const rest = sectionOrder.slice(1)
  let at = 0
  for (const k of keys.slice(0, Math.max(keys.indexOf('summary'), 0))) if (k === rest[at]) at++
  return { ...parsed, otherSections, sectionOrder: at > 0 ? [...rest.slice(0, at), 'summary', ...rest.slice(at)] : sectionOrder }
}
// ── End mirrored parse normalizers ── #149

// resumeText: the text parsed, which places the sections (sectionOrderFromText, #165).
export function parseParsedJson(raw: string, resumeText?: string): ParsedResume {
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
  return normalizedParse(parsed, resumeText)
}

export async function parseResumeStructure(
  resumeText: string,
  provider: AIProvider,
  apiKey: string,
): Promise<ParsedResume> {
  const prompt = buildParsePrompt(resumeText)

  // Both providers stream: a 12,000-character resume took 30-31 s
  // to parse on either, and Chrome stops a service worker whose fetch() gets no
  // response for 30 s (#31).
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
        ...HAIKU_PARSE_FIELDS,
        stream: true,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
      throw new Error(err.error?.message ?? `Claude API error ${res.status}`)
    }
    return parseParsedJson(await readSseText(res, claudeDelta), resumeText)
  }

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
  return parseParsedJson(await readSseText(res, chatDelta), resumeText)
}

function chatDelta(ev: Record<string, unknown>): string | undefined {
  return (ev.choices as Array<{ delta?: { content?: string } }> | undefined)?.[0]?.delta?.content
}
