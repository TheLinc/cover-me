import type { AIProvider, AppMode, JobData, ParsedResume, TailoredResume } from '../types'
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config'

// "Flag a problem" on a cover letter (popup) or a tailored resume (editor tab),
// #256. One press sends the output and its posting to the generation-report
// Edge Function, which adds one response to a PostHog survey. The user's
// details are taken out here, so they never leave the browser: their name,
// email, phone, links, location, street address and postal code.
//
// Guessing those from resume text missed too many layouts and formats, so they
// come from the user's parsed resume (read for the report: report-resume.ts),
// and the original resume is sent as that parse, never as its text. Patterns
// are the safety net under the known values: any web address, email, or
// phone-shaped number goes, whoever it belongs to.

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
const MAX_LETTER = 20_000

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
// Extra sections that hold nothing but personal details (or other people's).
const PERSONAL_SECTION = /\b(?:contact|personal|declaration|references?|referees|address)\b/i
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
    output: target.kind === 'letter'
      ? scrub(withoutLetterBlocks(target.output), known).slice(0, MAX_LETTER)
      : scrubResume(target.output, known),
    job: { title: target.job.title.slice(0, MAX_JOB_FIELD), company: target.job.company.slice(0, MAX_JOB_FIELD), description: target.job.description.slice(0, MAX_DESCRIPTION), site },
    mode: env.mode,
    // Hosted letters and resumes are written by Claude whatever the BYOK setting says.
    provider: env.mode === 'hosted' ? 'claude' : env.provider,
    version: env.version,
    contact: env.mode === 'hosted' && form.contact,
    ...(sendSource && { sourceResume: scrubResume(env.parsed, known) }),
  }
}

// A resume without its contact fields, deleted sections, Word file hash or
// personal sections, every line scrubbed: a summary or a bullet can name the user.
function scrubResume(resume: object, known: Known): Resume {
  const kept = Object.fromEntries(Object.entries(resume).filter(([k]) => !DROPPED.includes(k)))
  if (Array.isArray(kept.otherSections)) {
    kept.otherSections = kept.otherSections.filter((s: { heading?: unknown }) => !(typeof s?.heading === 'string' && PERSONAL_SECTION.test(s.heading)))
  }
  return JSON.parse(JSON.stringify(kept), (_, v) => (typeof v === 'string' ? scrub(v, known) : v))
}

interface Known { names: string[]; nameWords: string[]; emails: string[]; phones: string[]; links: string[]; places: string[]; placeWords: string[] }

// The user's details: the parse's, the tailored resume's own (a reported resume
// may hold an edited name), the account's email, and the name a letter signs with.
function knownDetails(target: ReportTarget, env: ReportEnv): Known {
  const sources: Array<Partial<Record<ContactField, unknown>> | undefined> = [env.parsed, target.kind === 'resume' ? target.output : undefined]
  const field = (f: ContactField) => sources.flatMap((s) => [s?.[f]].flat()).filter((v): v is string => typeof v === 'string' && !!v.trim()).map((v) => v.trim())
  const names = withShortForms([...field('name'), ...(target.kind === 'letter' ? signedName(target.output) : [])])
  const places = field('location')
  return {
    names,
    // Each part of the name alone, as written ("Jane", "Doe"): a letter can use
    // just one. Capitalized only, so the word "will" stays for a "Will".
    nameWords: [...new Set(names.flatMap((n) => n.split(/[\s"'“”‘’().,]+/)).filter((w) => /^\p{Lu}/u.test(w) && w.replace(/\P{L}/gu, '').length >= 3))],
    emails: [...field('email'), ...(env.accountEmail ? [env.accountEmail] : [])],
    phones: field('phone'),
    links: [...field('website'), ...field('links')].flatMap((l) => [l, bareLink(l)]),
    places,
    // Each part of the location alone ("Toronto" from "Toronto, ON"; "Rohini",
    // "New Delhi" from an address the parser put there), capitalized only, so
    // "reading" stays for a user in Reading.
    // A region code ("ON", "NSW") isn't taken alone: it goes with the city
    // beside it.
    placeWords: [...new Set(places.flatMap((p) => p.split(/\s*[,;·|]\s*/)).filter((w) => /^\p{Lu}/u.test(w) && w.replace(/\P{L}/gu, '').length >= 3 && !/^[A-Z]{2,3}$/.test(w)))],
  }
}

// A link as a letter may write it: no https://, www. or trailing slash.
const bareLink = (l: string) => l.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '')

// The name a letter signs with: the line after its closing ("Sincerely,").
function signedName(letter: string): string[] {
  const lines = letter.split('\n').map((l) => l.trim()).filter(Boolean)
  let close = lines.length
  while (close-- > 0 && !/^[\p{L} ]{3,40},$/u.test(lines[close]));
  const name = close === -1 ? undefined : lines[close + 1]
  // Up to four capitalized words, so a line that isn't a name doesn't become one.
  return name && /^\p{Lu}[\p{L}'.-]*(?:\s+\p{Lu}[\p{L}'.-]*){0,3}$/u.test(name) ? [name] : []
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

// The letter without what sits outside its body: an address block above the
// greeting ("Dear ..."), and the signature after its last paragraph, whatever
// the closing says. Kept: the closing line itself ("Best regards,").
function withoutLetterBlocks(letter: string): string {
  const lines = letter.split('\n')
  const greeting = lines.slice(0, 15).findIndex((l) => /^\s*(?:dear|hello|hi|hey|to whom|greetings|good (?:morning|afternoon|day))\b/i.test(l))
  let text = greeting > 0 && lines.slice(0, greeting).some((l) => l.trim()) ? `[contact details]\n\n${lines.slice(greeting).join('\n')}` : letter
  // From the end: short paragraphs whose lines after the first don't end a
  // sentence are the signature, or the closing with the name. A postscript
  // ("P.S. ...") is passed over (scrubbed like the rest), and a closing alone
  // on its line ("Sincerely,") stays.
  const paras = text.split(/\n[ \t]*\n/)
  for (let i = paras.length - 1, seen = 0; i > 0 && seen < 4; i--, seen++) {
    const ls = paras[i].split('\n').map((l) => l.trim()).filter(Boolean)
    if (/^P\.?\s?S\b/i.test(ls[0] ?? '')) continue
    if (ls.length === 1 && /^[\p{L} ]{3,40},$/u.test(ls[0])) continue
    if (!ls.length || ls.length > 5 || ls.some((l) => l.length > 70) || ls.slice(1).some((l) => /[.!?]$/.test(l))) break
    if (ls.length === 1 && /[.!?]$/.test(ls[0])) break
    const closing = ls[0].match(/^([\p{L} ]{3,40},)\s*\S/u)?.[1]
    paras[i] = ls.length > 1 ? `${ls[0]}\n[signature]` : closing ? `${closing} [signature]` : '[signature]'
  }
  return paras.join('\n\n')
}

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g
// "jane [at] example [dot] com", "jane(at)example.com", "jane at example dot com".
const OBFUSCATED_EMAIL = /[\w.+-]+\s*(?:\[\s*at\s*\]|\(\s*at\s*\)|\{\s*at\s*\})\s*[\w-]+(?:\s*(?:\[\s*dot\s*\]|\(\s*dot\s*\)|\{\s*dot\s*\}|\.)\s*[\w-]+)+|\b[\w.+-]+\s+(?:at|AT)\s+[\w-]+(?:\s+(?:dot|DOT)\s+[\w-]+)+/gi
const URL = /\b(?:https?:\/\/|www\.)[^\s"'”’<>]*[^\s.,;:!?)"'”’<>]/gi
// Any domain with a real ending, lowercase, and its path. "Node.js", "ASP.NET"
// and file names ("README.md") don't match; ALLOWED are tech names shaped like
// domains. ponytail: an employer named by its site ("Booking.com") goes too.
const TLDS = 'com|net|org|edu|gov|io|ai|dev|app|co|me|tv|cc|gg|so|to|ly|ee|fm|vc|xyz|tech|site|online|page|blog|design|studio|art|pro|info|biz|cloud|digital|live|space|website|codes|software|works|world|life|email|link|cv|id|uk|us|ca|au|nz|ie|de|fr|nl|es|it|se|ch|eu|in|jp|br|mx|sg|be|at|dk|no|fi|pl|pt|cz|za|ar|cl|hk|my|ph|tw|kr|cn|ru|tr|il|ae|ng|ke|pk|bd|lk|np|vn|th'
const DOMAIN = new RegExp(String.raw`(?<![\w@.-])(?:[A-Za-z0-9-]+\.)+(?:${TLDS})(?![\w-])(?:\/[^\s"'”’<>]*[^\s.,;:!?)"'”’<>])?`, 'g')
const ALLOWED = new Set(['socket.io', 'fast.ai'])
// "GitHub: pixelcat", "Twitter: @pixelcat", "LinkedIn: in/pixelcat".
const HANDLE_LABEL = /\b(GitHub|GitLab|Twitter|LinkedIn|Instagram|Kaggle|Medium|Behance|Dribbble|Telegram|Skype|Discord|Mastodon|Threads|TikTok|YouTube|Bluesky|Website|Portfolio|Homepage|Blog|Web|X)(\s*[:：]\s*)(?!\[)[^\s,;|·]+/g
const HANDLE = /(?<![\w@.])@[A-Za-z0-9_](?:[A-Za-z0-9_.]{0,28}[A-Za-z0-9_])?/g
// A phone number in any country's format: 8 to 15 digits starting with +, (,
// 0, or as a North American number. Never years ("2019 - 2024 2025").
const PHONE_SHAPE = /(?:\+\s?\d|\(\d|\b\d)[\d \t().-]{6,22}\d/g
const isPhone = (m: string) => {
  const digits = m.replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) return false
  if (m.split(/[^\d]+/).filter(Boolean).every((g) => /^(?:19|20)\d\d$/.test(g))) return false
  return /^[+(0]/.test(m) || (digits.length === 10 && /^[2-9]/.test(digits))
}

// Addresses and postal codes, whoever's (a known location's neighbours go
// with it below). North American and UK street numbers first ("14 Rosebery
// Road"), a year only before a word that can't be anything but a street; then
// a street named before its number ("Calle Mayor 10", "Hauptstraße 5"), French
// ("12 rue de la Paix"), and flat or house numbers ("Flat 402", "House No. 45").
const STATES = 'AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT|AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|PR|GU|VI|AS|MP|AA|AE|AP'
const STREETS = 'Street|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Crescent|Cres|Parkway|Pkwy|Highway|Hwy'
const STREET_OR_WORD = 'St|Drive|Dr|Way|Court|Ct|Place|Pl|Terrace|Close|Square|Sq|Circle|Cir|Trail|Trl|Grove|Gardens|Mews|Row'
// end: a word that can be an ordinary one ("15 Supreme Court cases", "12 Month
// End Close cycles") counts only where the address ends: a comma, a
// separator or the line's end ("14 Elm Grove, Bristol").
const street = (words: string, number: string, end = '') => String.raw`\b${number}[A-Za-z]?(?:[ \t]+(?:[A-Z][\w'.-]*|\d+(?:st|nd|rd|th|ST|ND|RD|TH))){1,4}[ \t]+(?:${words}|${words.toUpperCase()})\b\.?(?:,?[ \t]*(?:Apt|Unit|Suite|APT|UNIT|SUITE|#)[ \t]*[\w-]+)?${end}`
const ADDRESSES = [
  new RegExp(`${street(STREETS, String.raw`\d{1,6}`)}|${street(STREET_OR_WORD, String.raw`(?!(?:19|20)\d\d\b)\d{1,6}`, String.raw`(?=[ \t]*(?:[,·|;\r\n]|$))`)}`, 'g'),
  /\b(?:Calle|C\/|Carrer|Avenida|Avda\.?|Rua|Via|Viale|Corso|Piazza|Plaza|Plaça|Paseo|Strada|Ulica|ul\.)\s+[\p{L}'. -]{2,40}?,?\s+\d{1,5}[A-Za-z]?\b/gu,
  /\b[\p{L}-]*(?:straße|strasse|weg|gasse|platz|allee|laan|gracht|vej|gatan|gata|katu|damm)\s+\d{1,5}[a-z]?\b/giu,
  /\b\d{1,5}(?:\s?(?:bis|ter))?,?\s+(?:rue|avenue|boulevard|bd|allée|chemin|impasse|quai|place)\s+(?:(?:de|du|des|la|le|l')\s*)*\p{Lu}[\p{L}'-]+(?:[ -]\p{Lu}[\p{L}'-]+)*/gu,
  /\b(?:House|Flat|Plot|Door|Apartment|Apt|Unit|Suite|Block)\s*(?:No\.?\s*)?[\w/-]*\d[\w/-]*/gu,
  /\bSector\s+\d{1,3}\b/g,
]
const POSTAL = new RegExp(String.raw`\b[A-Z]\d[A-Z][ ]?\d[A-Z]\d\b|\b[A-Z]{1,2}\d[A-Z\d]?[ ]\d[A-Z]{2}\b|(?<=,[ \t]?)(?:${STATES})[ \t]+\d{5}(?:-\d{4})?\b`, 'g')

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Whole words, any run of spaces between them ("Jane  Doe", "JANE\nDOE").
const wordsPattern = (v: string) => `(?<![\\p{L}\\p{N}])${v.trim().split(/\s+/).map(escape).join('\\s+')}(?![\\p{L}\\p{N}])`
const byLength = (a: string, b: string) => b.length - a.length
// A known phone by its digits, in any format, with or without its country
// code, area code or a leading 0 ("+44 7700 900123", "07700 900123",
// "612 345 678" for +34, "555-0199" for (416) 555-0199): its last 10, 9 and,
// for a full number, 7 digits.
const phonePatterns = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7) return []
  const tails = [...new Set([10, 9, ...(digits.length >= 10 ? [7] : [])].filter((n) => n <= digits.length).map((n) => digits.slice(-n)))]
  return tails.map((t) => new RegExp(`(?:\\+?\\d{1,3}[\\s().-]*)?(?:0[\\s().-]*)?\\(?(?<!\\d)${t.split('').join('[\\s().-]*')}(?!\\d)`, 'g'))
}

// One pass over a string the report sends: emails, web addresses and handles,
// phones, then the user's name, location and addresses. Emails first, so a
// name can't eat an email's first half ("[name]@janedoe.dev").
function scrub(text: string, known: Known): string {
  for (const e of [...known.emails].sort(byLength)) text = text.replace(new RegExp(escape(e), 'gi'), '[email]')
  text = text.replace(EMAIL, '[email]').replace(OBFUSCATED_EMAIL, '[email]')
  for (const l of [...known.links].sort(byLength)) if (l.length >= 4) text = text.replace(new RegExp(wordsPattern(l), 'giu'), '[link]')
  text = text.replace(URL, '[link]')
    .replace(HANDLE_LABEL, '$1$2[link]')
    .replace(DOMAIN, (d) => (ALLOWED.has(d.toLowerCase()) ? d : '[link]'))
    .replace(HANDLE, '[link]')
  for (const re of known.phones.flatMap(phonePatterns)) text = text.replace(re, '[phone]')
  text = text.replace(PHONE_SHAPE, (m) => (isPhone(m) ? '[phone]' : m))
  for (const n of [...known.names].sort(byLength)) if (n.length >= 3) text = text.replace(new RegExp(wordsPattern(n), 'giu'), '[name]')
  for (const w of known.nameWords) text = text.replace(new RegExp(wordsPattern(w), 'gu'), '[name]').replace(new RegExp(wordsPattern(w.toUpperCase()), 'gu'), '[name]')
  for (const a of ADDRESSES) text = text.replace(a, '[address]')
  text = text.replace(POSTAL, (m) => (/^[A-Z]{2}\s+\d/.test(m) ? `${m.slice(0, 2)} [postal code]` : '[postal code]'))
  for (const p of [...known.places].sort(byLength)) if (p.length >= 3) text = text.replace(new RegExp(wordsPattern(p), 'giu'), '[location]')
  for (const w of [...known.placeWords].sort(byLength)) text = text.replace(new RegExp(wordsPattern(w), 'gu'), '[location]').replace(new RegExp(wordsPattern(w.toUpperCase()), 'gu'), '[location]')
  // A postal code or region beside the user's location goes with it ("28013
  // Madrid", "Sydney NSW 2000", "New Delhi - 110085"); a year beside it stays
  // ("Toronto 2018 - 2020"), unless a region code comes first (Australia's 2000).
  return text.replace(/(?:\b(?!(?:19|20)\d\d\b)\d{4,6}[ \t]+)?\[location\](?:,?[ \t]*\b[A-Z]{2,3}\b(?:[ \t]+\d{4,6}\b)?)?(?:[ \t]*-[ \t]*(?!(?:19|20)\d\d\b)\d{4,6}\b|[ \t]+(?!(?:19|20)\d\d\b)\d{4,6}\b)?/g, '[location]')
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
