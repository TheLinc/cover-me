import type { AIProvider, AppMode, JobData, ParsedResume, TailoredResume } from '../types'
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config'

// "Flag a problem" on a cover letter (popup) or a tailored resume (editor tab),
// #256. Sends the output and its posting to the generation-report Edge
// Function, which adds one response to a PostHog survey.
//
// The user's name, email, phone, links and city are replaced here, exactly,
// with the values in their parsed resume (read for the report:
// report-resume.ts), and so is any email, web address or phone number,
// whoever's. Nothing guesses at the rest (addresses, other people's names):
// the form shows what will be sent, editable, and sends what the user leaves.
// The original resume goes as that parse, never as its text.

// The uninstall survey's quality reasons, so the two can be compared.
export const REPORT_CATEGORIES = [
  { key: 'design', label: 'The design or layout looked wrong' },
  { key: 'generic', label: 'The wording sounded generic or not like me' },
  { key: 'invented', label: "It added things that aren't true" },
  { key: 'missing', label: 'It left out things that matter' },
  { key: 'other', label: 'Other' },
] as const
export type ReportCategory = (typeof REPORT_CATEGORIES)[number]['key']
export const MAX_COMMENT = 500
// The most the prompts read of a posting, and the most of a field the server takes.
const MAX_DESCRIPTION = 15_000
const MAX_JOB_FIELD = 500
export const MAX_LETTER = 20_000

export interface ReportForm {
  category: ReportCategory
  comment: string
  sendSource: boolean // "Also send my original resume", only for 'invented'
  contact: boolean // "You can email me about this", Hosted only
}

export type ReportTarget =
  | { kind: 'letter'; output: string; job: JobData }
  | { kind: 'resume'; output: TailoredResume; job: JobData }

// parsed: the user's resume, read for this report, which names their details
// exactly. accountEmail: a Hosted account's email, also theirs.
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

const CONTACT_FIELDS = ['name', 'phone', 'email', 'website', 'links', 'location'] as const
type ContactField = (typeof CONTACT_FIELDS)[number]
// sourceHash: the user's Word file's hash, which a Pro account also stores.
// Deleted sections print nowhere and can be long.
const DROPPED: readonly string[] = [...CONTACT_FIELDS, 'deletedSections', 'sourceHash']
// The generation-report function's check for a site name.
const HOST = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9-]{2,}$/

export function buildGenerationReport(target: ReportTarget, form: ReportForm, env: ReportEnv): GenerationReport {
  const known = knownDetails(target, env)
  const sendSource = form.category === 'invented' && form.sendSource
  // A name only: none for a pasted posting, or one the server wouldn't take (an IP address).
  let site = ''
  try { site = new globalThis.URL(target.job.url).hostname.replace(/^www\./, '') } catch { /* pasted: no address */ }
  if (!HOST.test(site)) site = ''

  return {
    category: form.category,
    comment: form.comment.trim(),
    kind: target.kind,
    output: target.kind === 'letter' ? scrub(target.output.slice(0, MAX_LETTER), known).slice(0, MAX_LETTER) : scrubResume(target.output, known),
    job: { title: target.job.title.slice(0, MAX_JOB_FIELD), company: target.job.company.slice(0, MAX_JOB_FIELD), description: target.job.description.slice(0, MAX_DESCRIPTION), site },
    mode: env.mode,
    // Hosted letters and resumes are written by Claude whatever the BYOK setting says.
    provider: env.mode === 'hosted' ? 'claude' : env.provider,
    version: env.version,
    contact: env.mode === 'hosted' && form.contact,
    ...(sendSource && { sourceResume: scrubResume(env.parsed, known) }),
  }
}

// A resume without its contact fields, deleted sections or Word file hash,
// every line scrubbed: a summary or a bullet can name the user.
function scrubResume(resume: object, known: Known): Resume {
  const kept = Object.fromEntries(Object.entries(resume).filter(([k]) => !DROPPED.includes(k)))
  return JSON.parse(JSON.stringify(kept), (_, v) => (typeof v === 'string' ? scrub(v, known) : v)) as Resume
}

// The preview shows each text a resume report sends, to edit before Send. Not
// shown: the section order and the edit time, which name no one.
type Path = Array<string | number>
// In the resume's own order: a stored one comes back with its keys sorted.
const NOT_SHOWN = new Set(['sectionOrder', 'editedAt'])
const ORDER = ['summary', 'experience', 'projects', 'education', 'skills', 'certifications', 'otherSections']
const rank = (k: string) => (ORDER.includes(k) ? ORDER.indexOf(k) : ORDER.length)
export function resumeTexts(resume: object, path: Path = []): Array<{ path: Path; text: string }> {
  const entries = Object.entries(resume)
  if (!path.length) entries.sort(([a], [b]) => rank(a) - rank(b))
  return entries.flatMap(([k, v]) => {
    if (NOT_SHOWN.has(k)) return []
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

// The user's details: the parse's, the tailored resume's own (a reported resume
// may hold an edited name), and the account's email. Anything else is for the
// user to take out in the preview.
function knownDetails(target: ReportTarget, env: ReportEnv): Known {
  const sources: Array<Partial<Record<ContactField, unknown>> | undefined> = [env.parsed, target.kind === 'resume' ? target.output : undefined]
  const field = (f: ContactField) => sources.flatMap((s) => [s?.[f]].flat()).filter((v): v is string => typeof v === 'string' && !!v.trim()).map((v) => v.trim())
  const names = [...new Set(withShortForms(field('name')).flatMap(spellings))]
  return {
    names,
    // Each part of the name alone, as written ("Jane", "Doe"): a letter can use
    // just one. Capitalized only (or in a script without capitals), so the word
    // "will" stays for a "Will".
    nameWords: [...new Set(names.flatMap((n) => n.split(/[\s"'“”‘’().,-]+/)).filter((w) => (/^\p{Lu}/u.test(w) || caseless(w)) && w.replace(/\P{L}/gu, '').length >= 2))],
    emails: [...field('email'), ...(env.accountEmail ? [env.accountEmail] : [])],
    phones: field('phone'),
    links: [...field('website'), ...field('links')].flatMap((l) => [l, bareLink(l), ...handleOf(l)]),
    // The whole location, and its city: the first part, without a region code
    // or postcode after it ("Toronto" of "Toronto, ON", "Brooklyn" of "Brooklyn
    // NY 11201"), also without accents. "Remote" or "Hybrid" alone is no place.
    places: [...new Set(field('location').flatMap((l) => [l, l.split(/[,;|/]/)[0].replace(/(?:\s+(?:[A-Z]{2,3}|\d[\d -]{2,9}))+$/, '').trim()]).flatMap(spellings))]
      .filter((p) => !/^(?:remote|hybrid)$/i.test(p)),
  }
}

// A link as a letter may write it: no https://, www. or trailing slash.
const bareLink = (l: string) => l.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '')
// The handle in a profile link, which a letter can write alone ("GitHub -
// janedoe"): its first path part, past "in/" or "u/" ("linkedin.com/in/jane-doe").
// Profile sites only: "janedoe.dev/work" has no handle.
const PROFILE_SITE = /^(?:[\w-]+\.)?(?:github\.com|gitlab\.com|linkedin\.com|twitter\.com|x\.com|instagram\.com|behance\.net|dribbble\.com|medium\.com|kaggle\.com|leetcode\.com|hackerrank\.com|codepen\.io|youtube\.com|tiktok\.com|threads\.net|bsky\.app|dev\.to|hashnode\.com|t\.me)$/i
const handleOf = (l: string) => {
  const [host, ...path] = bareLink(l).split(/[/?#]/)
  return PROFILE_SITE.test(host) ? path.map((p) => p.replace(/^@/, '')).filter((p) => !/^(?:in|pub|u|user|users|profile|company|gallery)$/i.test(p)).slice(0, 1) : []
}

// A letter often signs without the title or middle name the resume has
// ("Dr. Jane A. Doe" signs "Jane Doe"), so each name also goes without its
// title, and as its first and last words.
function withShortForms(names: string[]): string[] {
  return [...new Set(names.flatMap((name) => {
    const bare = name.replace(/^(dr|mr|mrs|ms|mx|prof)\.?\s+/i, '')
    const words = bare.split(/\s+/)
    return [name, bare, ...(words.length > 2 ? [`${words[0]} ${words[words.length - 1]}`] : [])]
  }))]
}

const EMAIL = /[\w.+-]{1,64}@[\w-]+(?:\.[\w-]+)+/g
const URL = /\b(?:https?:\/\/|www\.)[^\s"'”’<>]*[^\s.,;:!?)"'”’<>]/gi
// A phone number in any country's format: 8 to 15 digits starting with +, (,
// 0, or as a North American number. Never years ("2019 - 2024 2025") or a
// figure before them ("from 32 to 61 (2022-2023)"), dates ("03.2019 -
// 11.2021", "12.04.1995") or an amount after a currency sign ("$2 500 000 000").
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
// Whole words, any run of spaces between them ("Jane  Doe", "JANE\nDOE").
const wordsPattern = (v: string) => `(?<![\\p{L}\\p{N}])${v.trim().split(/\s+/).map(escape).join('\\s+')}(?![\\p{L}\\p{N}])`
const byLength = (a: string, b: string) => b.length - a.length
// Chinese, Japanese, Arabic and other scripts without capitals, which a name
// is matched in without word edges (no spaces between words in CJK).
const caseless = (s: string) => !/[\p{Lu}\p{Ll}]/u.test(s)
const namePattern = (n: string) => (caseless(n) ? n.trim().split(/\s+/).map(escape).join('\\s*') : wordsPattern(n))
// A name as a letter may spell it: "José Núñez" as "Jose Nunez", "Jürgen
// Müller" as "Juergen Mueller".
const deaccent = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '')
const UMLAUTS: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', Ä: 'Ae', Ö: 'Oe', Ü: 'Ue', ß: 'ss' }
const spellings = (s: string) => [s, deaccent(s), deaccent(s.replace(/[äöüÄÖÜß]/g, (c) => UMLAUTS[c]))]
// A capitalized word as written, in capitals, and in title case (a parse that
// wrote "JANE DOE" still finds "Jane"), but never in lower case.
const cases = (w: string) => [...new Set([w, w.toUpperCase(), w.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, p: string, c: string) => p + c.toUpperCase())])]
// A known phone by its digits, in any format, with or without its country
// code, area code or a leading 0 ("+44 7700 900123", "07700 900123",
// "612 345 678" for +34, "555-0199" for (416) 555-0199): each length from the
// whole number down to 8, and 7 for a full number.
const phonePatterns = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7) return []
  const lengths = [...Array(digits.length - 6).keys()].map((i) => digits.length - i).filter((n) => n > 7 || digits.length === 7 || digits.length >= 10)
  return lengths.map((n) => new RegExp(`(?<!\\d)(?:\\+?\\d{1,3}[ \\t()./-]*)?(?:0[ \\t()./-]*)?\\(?${digits.slice(-n).split('').join('[ \\t()./-]*')}(?!\\d)`, 'g'))
}

// One pass over a string the report sends: emails, web addresses, phones,
// then the user's name and location. Emails first, so a name can't eat an
// email's first half ("[name]@janedoe.dev").
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

// Results already reported from this browser (a letter's time, a resume's
// History ID), so reopening the popup or the editor doesn't offer it again.
export async function reportedResults(): Promise<string[]> {
  const { reportedResults } = await chrome.storage.local.get('reportedResults')
  return (reportedResults as string[] | undefined) ?? []
}

export async function rememberReportedResult(key: string): Promise<void> {
  await chrome.storage.local.set({ reportedResults: [...new Set([...(await reportedResults()), key])].slice(-100) })
}

// Throws with the response status, 0 when the server couldn't be reached.
// token: only with "You can email me", so the report carries the account ID.
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
