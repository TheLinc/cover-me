import type { AIProvider, AppMode, JobData, ParsedResume, TailoredResume } from '../types'
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config'

// Only the user's own details (from their parse) and email, web address and
// phone shapes are replaced; the rest is the user's to delete in the preview (#256).

// The uninstall survey's quality reasons, so the two can be compared (#256).
export const REPORT_CATEGORIES = [
  { key: 'design', label: 'The design or layout looked wrong' },
  { key: 'generic', label: 'The wording sounded generic or not like me' },
  { key: 'invented', label: "It added things that aren't true" },
  { key: 'missing', label: 'It left out things that matter' },
  { key: 'other', label: 'Other' },
] as const
export type ReportCategory = (typeof REPORT_CATEGORIES)[number]['key']
export const MAX_COMMENT = 500
// The most the prompts read of a posting, and the most of a field the server takes (#256).
const MAX_DESCRIPTION = 15_000
const MAX_JOB_FIELD = 500
export const MAX_LETTER = 20_000

export interface ReportForm {
  category: ReportCategory
  comment: string
  sendSource: boolean
  contact: boolean
}

export type ReportTarget =
  | { kind: 'letter'; output: string; job: JobData }
  | { kind: 'resume'; output: TailoredResume; job: JobData }

export interface ReportEnv { mode: AppMode; provider: AIProvider; version: string; parsed: ParsedResume; accountEmail?: string }

type Resume = Record<string, unknown>

export interface GenerationReport {
  category: ReportCategory
  comment: string
  kind: 'letter' | 'resume'
  output: string | Resume
  job: { title: string; company: string; description: string; site: string }
  mode: AppMode
  provider: AIProvider
  version: string
  contact: boolean
  sourceResume?: Resume
}

const CONTACT_FIELDS: readonly string[] = ['name', 'phone', 'email', 'website', 'links', 'location']
type ContactField = 'name' | 'phone' | 'email' | 'website' | 'links' | 'location'
// sourceHash would link a report to a Pro account's Word file (#256).
const DROPPED: readonly string[] = ['deletedSections', 'sourceHash']
// The generation-report function's check for a site name (#256).
const HOST = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9-]{2,}$/

export function buildGenerationReport(target: ReportTarget, form: ReportForm, env: ReportEnv): GenerationReport {
  const known = knownDetails(target, env)
  const sendSource = form.category === 'invented' && form.sendSource
  let site = ''
  try { site = new globalThis.URL(target.job.url).hostname.replace(/^www\./, '') } catch { /* pasted: no address (#256) */ }
  if (!HOST.test(site)) site = ''

  return {
    category: form.category,
    comment: form.comment.trim(),
    kind: target.kind,
    // Cut after replacing too: a tag can be longer than what it replaces (#256).
    output: target.kind === 'letter' ? scrub(target.output.slice(0, MAX_LETTER), known).slice(0, MAX_LETTER) : scrubResume(target.output, known),
    job: { title: target.job.title.slice(0, MAX_JOB_FIELD), company: target.job.company.slice(0, MAX_JOB_FIELD), description: target.job.description.slice(0, MAX_DESCRIPTION), site },
    mode: env.mode,
    // Hosted letters and resumes are written by Claude whatever the BYOK setting says (#256).
    provider: env.mode === 'hosted' ? 'claude' : env.provider,
    version: env.version,
    contact: env.mode === 'hosted' && form.contact,
    ...(sendSource && { sourceResume: scrubResume(env.parsed, known) }),
  }
}

// Header fields go as tags as long as the value ("Jane Doe" as "[name]xx"), so a
// rendered report keeps the header's shape and line breaks (#256).
const TAGS: Record<ContactField, string> = { name: '[name]', email: '[email]', phone: '[phone]', website: '[link]', links: '[link]', location: '[location]' }
const tagged = (tag: string, v: unknown) => (typeof v === 'string' && v.trim() ? tag.padEnd(v.trim().length, 'x') : '')

function scrubResume(resume: object, known: Known): Resume {
  const kept = Object.fromEntries(Object.entries(resume).filter(([k]) => !DROPPED.includes(k)))
  const scrubbed = JSON.parse(JSON.stringify(kept), (_, v) => (typeof v === 'string' ? scrub(v, known) : v)) as Resume
  for (const f of Object.keys(TAGS) as ContactField[]) {
    if (!(f in scrubbed)) continue
    const v = (resume as Resume)[f]
    scrubbed[f] = Array.isArray(v) ? v.map((l) => tagged(TAGS[f], l)) : tagged(TAGS[f], v)
  }
  return scrubbed
}

type Path = Array<string | number>
// The section order and edit time name no one, and the header is tags only (#256).
const NOT_SHOWN = new Set(['sectionOrder', 'editedAt'])
// In the resume's own order: a stored one comes back with its keys sorted (#256).
const ORDER = ['summary', 'experience', 'projects', 'education', 'skills', 'certifications', 'otherSections', 'title', 'name', 'degree', 'company', 'institution', 'location', 'dates', 'heading', 'bullets', 'lines']
const rank = (k: string) => (ORDER.includes(k) ? ORDER.indexOf(k) : ORDER.length)
export function resumeTexts(resume: object, path: Path = []): Array<{ path: Path; text: string }> {
  const entries = Object.entries(resume)
  if (!Array.isArray(resume)) entries.sort(([a], [b]) => rank(a) - rank(b))
  return entries.flatMap(([k, v]) => {
    if (NOT_SHOWN.has(k) || (!path.length && CONTACT_FIELDS.includes(k))) return []
    const at = [...path, Array.isArray(resume) ? Number(k) : k]
    if (typeof v === 'string') return [{ path: at, text: v }]
    return v && typeof v === 'object' ? resumeTexts(v, at) : []
  })
}
export function withResumeText(resume: Resume, path: Path, text: string): Resume {
  const copy = structuredClone(resume)
  const parent = path.slice(0, -1).reduce<Record<string | number, unknown>>((o, k) => o[k] as Record<string | number, unknown>, copy)
  parent[path[path.length - 1]] = text
  return copy
}

interface Known { names: string[]; nameWords: string[]; emails: string[]; phones: string[]; links: string[]; places: string[] }

// A reported resume may hold an edited name, so its own header counts too (#256).
function knownDetails(target: ReportTarget, env: ReportEnv): Known {
  const sources: Array<Partial<Record<ContactField, unknown>> | undefined> = [env.parsed, target.kind === 'resume' ? target.output : undefined]
  const field = (f: ContactField) => sources.flatMap((s) => [s?.[f]].flat()).filter((v): v is string => typeof v === 'string' && !!v.trim()).map((v) => v.trim())
  const names = [...new Set(withShortForms(field('name')).flatMap(spellings))]
  return {
    names,
    // A letter can use one part of the name; capitalized only, so "will" stays for a "Will" (#256).
    nameWords: [...new Set(names.flatMap((n) => n.split(/[\s"'“”‘’().,-]+/)).filter((w) => (/^\p{Lu}/u.test(w) || caseless(w)) && w.replace(/\P{L}/gu, '').length >= 2))],
    emails: [...field('email'), ...(env.accountEmail ? [env.accountEmail] : [])],
    phones: field('phone'),
    links: [...field('website'), ...field('links')].flatMap((l) => [l, bareLink(l), ...handleOf(l)]),
    // The city: the first part without a region code or postcode ("Brooklyn" of
    // "Brooklyn NY 11201"); "Remote" alone is no place (#256).
    places: [...new Set(field('location').flatMap((l) => [l, l.split(/[,;|/]/)[0].replace(/(?:\s+(?:[A-Z]{2,3}|\d[\d -]{2,9}))+$/, '').trim()]).flatMap(spellings))]
      .filter((p) => !/^(?:remote|hybrid)$/i.test(p)),
  }
}

const bareLink = (l: string) => l.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '')
// A letter can write a profile handle alone ("GitHub - janedoe"); "janedoe.dev/work" has none (#256).
const PROFILE_SITE = /^(?:[\w-]+\.)?(?:github\.com|gitlab\.com|linkedin\.com|twitter\.com|x\.com|instagram\.com|behance\.net|dribbble\.com|medium\.com|kaggle\.com|leetcode\.com|hackerrank\.com|codepen\.io|youtube\.com|tiktok\.com|threads\.net|bsky\.app|dev\.to|hashnode\.com|t\.me)$/i
const handleOf = (l: string) => {
  const [host, ...path] = bareLink(l).split(/[/?#]/)
  return PROFILE_SITE.test(host) ? path.map((p) => p.replace(/^@/, '')).filter((p) => !/^(?:in|pub|u|user|users|profile|company|gallery)$/i.test(p)).slice(0, 1) : []
}

// A letter often signs without the resume's title or middle name ("Dr. Jane A. Doe" as "Jane Doe") (#256).
function withShortForms(names: string[]): string[] {
  return [...new Set(names.flatMap((name) => {
    const bare = name.replace(/^(dr|mr|mrs|ms|mx|prof)\.?\s+/i, '')
    const words = bare.split(/\s+/)
    return [name, bare, ...(words.length > 2 ? [`${words[0]} ${words[words.length - 1]}`] : [])]
  }))]
}

const EMAIL = /[\w.+-]{1,64}@[\w-]+(?:\.[\w-]+)+/g
const URL = /\b(?:https?:\/\/|www\.)[^\s"'”’<>]*[^\s.,;:!?)"'”’<>]/gi
// Any country's phone format, but never years ("2019 - 2024"), dates ("12.04.1995")
// or money ("$2 500 000 000") (#256).
const PHONE_SHAPE = /(?:\+\s?\d|\(\d|\b\d)[\d \t()./-]{6,22}\d/g
const isPhone = (m: string, at: number, text: string) => {
  const digits = m.replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) return false
  if (/[$€£¥₹]\s?$/.test(text.slice(Math.max(0, at - 2), at))) return false
  const groups = m.split(/[^\d]+/).filter(Boolean)
  if (groups.every((g) => /^(?:19|20)\d\d$/.test(g))) return false
  if (groups.length > 2 && groups.slice(-2).every((g) => /^(?:19|20)\d\d$/.test(g))) return false
  if (/\b(?:0?[1-9]|1[0-2]|[0-3]?\d[./-](?:0?[1-9]|1[0-2]))[./-](?:19|20)\d\d\b/.test(m)) return false
  return /^[+(0]/.test(m) || (digits.length === 10 && /^[2-9]/.test(digits))
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Any run of spaces between words: a PDF's text can split "JANE\nDOE" (#256).
const wordsPattern = (v: string) => `(?<![\\p{L}\\p{N}])${v.trim().split(/\s+/).map(escape).join('\\s+')}(?![\\p{L}\\p{N}])`
const byLength = (a: string, b: string) => b.length - a.length
// Scripts without capitals have no word edges to match on in CJK (#256).
const caseless = (s: string) => !/[\p{Lu}\p{Ll}]/u.test(s)
const namePattern = (n: string) => (caseless(n) ? n.trim().split(/\s+/).map(escape).join('\\s*') : wordsPattern(n))
// A letter may spell "José Núñez" as "Jose Nunez", "Jürgen Müller" as "Juergen Mueller" (#256).
const deaccent = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '')
const UMLAUTS: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', Ä: 'Ae', Ö: 'Oe', Ü: 'Ue', ß: 'ss' }
const spellings = (s: string) => [s, deaccent(s), deaccent(s.replace(/[äöüÄÖÜß]/g, (c) => UMLAUTS[c]))]
// A parse in capitals ("JANE DOE") still finds "Jane"; never lower case (#256).
const cases = (w: string) => [...new Set([w, w.toUpperCase(), w.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, p: string, c: string) => p + c.toUpperCase())])]
// The user's phone in any format, with or without country or area code: each
// length of its last digits down to 8, and 7 for a full number (#256).
const phonePatterns = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7) return []
  const lengths = [...Array(digits.length - 6).keys()].map((i) => digits.length - i).filter((n) => n > 7 || digits.length === 7 || digits.length >= 10)
  return lengths.map((n) => new RegExp(`(?<!\\d)(?:\\+?\\d{1,3}[ \\t()./-]*)?(?:0[ \\t()./-]*)?\\(?${digits.slice(-n).split('').join('[ \\t()./-]*')}(?!\\d)`, 'g'))
}

// Emails first, so a name can't eat an email's first half ("[name]@janedoe.dev") (#256).
function scrub(text: string, known: Known): string {
  for (const e of [...known.emails].sort(byLength)) text = text.replace(new RegExp(escape(e), 'gi'), '[email]')
  text = text.replace(EMAIL, '[email]')
  for (const l of [...known.links].sort(byLength)) if (l.length >= 4) text = text.replace(new RegExp(wordsPattern(l), 'giu'), '[link]')
  text = text.replace(URL, '[link]')
  for (const re of known.phones.flatMap(phonePatterns)) text = text.replace(re, '[phone]')
  text = text.replace(PHONE_SHAPE, (m, at: number, all: string) => (isPhone(m, at, all) ? '[phone]' : m))
  for (const n of [...known.names].sort(byLength)) if (n.length >= 3 || caseless(n)) text = text.replace(new RegExp(namePattern(n), 'giu'), '[name]')
  for (const w of known.nameWords.flatMap(cases)) text = text.replace(new RegExp(namePattern(w), 'gu'), '[name]')
  for (const p of [...known.places].sort(byLength).flatMap(cases)) if (p.length >= 3 || caseless(p)) text = text.replace(new RegExp(namePattern(p), 'gu'), '[location]')
  return text
}

// Kept so reopening the popup or the editor doesn't offer the same result again (#256).
export async function reportedResults(): Promise<string[]> {
  const { reportedResults } = await chrome.storage.local.get('reportedResults')
  return (reportedResults as string[] | undefined) ?? []
}

export async function rememberReportedResult(key: string): Promise<void> {
  await chrome.storage.local.set({ reportedResults: [...new Set([...(await reportedResults()), key])].slice(-100) })
}

// The token goes only with "You can email me", so only then does a report carry the account ID (#256).
export async function sendGenerationReport(report: GenerationReport, token?: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/generation-report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_PUBLISHABLE_KEY,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(report),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null)
  if (!res?.ok) throw Object.assign(new Error('Report failed'), { status: res?.status ?? 0 })
}
