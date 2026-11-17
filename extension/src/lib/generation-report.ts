import type { AIProvider, AppMode, JobData, ResumeData, TailoredResume } from '../types'
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config'

// "Flag a problem" on a cover letter (popup) or a tailored resume (editor tab),
// #256. One press sends the output and its posting to the generation-report
// Edge Function, which adds one response to a PostHog survey. Contact details
// are taken out here, so they never leave the browser.

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
// The most the prompts read of a posting, and the most of a resume the server takes.
const MAX_DESCRIPTION = 15_000
const MAX_JOB_FIELD = 500
const MAX_LETTER = 20_000
const MAX_SOURCE = 30_000

export interface ReportForm {
  category: ReportCategory
  comment: string
  sendSource: boolean // "Also send my original resume", only for 'invented'
  contact: boolean // "You can email me about this", Hosted only
}

export type ReportTarget =
  | { kind: 'letter'; output: string; job: JobData }
  | { kind: 'resume'; output: TailoredResume; job: JobData }

// tailored: the newest tailored resume in History. Hosted keeps no parse in the
// browser, but the server's parse put the contact details in each tailored resume.
export interface ReportEnv { mode: AppMode; provider: AIProvider; version: string; resume: ResumeData | null; tailored?: TailoredResume }

export interface GenerationReport {
  category: ReportCategory
  comment: string
  kind: 'letter' | 'resume'
  output: string | Omit<TailoredResume, ContactField | 'deletedSections' | 'sourceHash'>
  job: { title: string; company: string; description: string; site: string }
  mode: AppMode
  provider: AIProvider
  version: string
  contact: boolean
  sourceResume?: string
}

const CONTACT_FIELDS = ['name', 'phone', 'email', 'website', 'links', 'location'] as const
type ContactField = (typeof CONTACT_FIELDS)[number]
// sourceHash: the user's Word file's hash, which a Pro account also stores.
const DROPPED = [...CONTACT_FIELDS, 'deletedSections', 'sourceHash'] as const
// The generation-report function's check for a site name.
const HOST = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9-]{2,}$/

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g
// A North American number, or anything after a +. Not any long run of digits:
// "2019 - 2024 2025" is dates.
const PHONE = /(?:\+\d[\d ().-]{7,}\d|\(?\b\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}\b)/g
// Only addresses that can't be anything else. A bare portfolio domain comes
// from the parse, the tailored resume, or headerDomains.
const URL = /(?:https?:\/\/|www\.)\S+|\b(?:[\w-]+\.)*(?:linkedin|github|gitlab|behance|dribbble)\.com\/\S*/gi
// A domain with a common site ending (lowercase, so "ASP.NET" stays out; the
// list keeps "Node.js" out), an optional country part ("com.br"), and its path.
const DOMAIN = /\b[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.(?:com|dev|io|me|net|org|co|ca|app|page|site|xyz|tech|ai|design|blog|info|studio|so|to|ie|uk|us|de|fr|au|in|nl)(?:\.[a-z]{2})?\b(?:\/[^\s·|,]*)?/g
// A line that holds contact details, not a summary or a skills list.
const CONTACT_LINE = /[·|•]|\b(?:portfolio|website|web|site|blog)\b/i

// Without a parse or History (Hosted, or BYOK before the first tailor), the
// user's own domains are the ones on the contact lines near the resume's top.
// ponytail: an employer's domain there is taken too.
function headerDomains(text: string): string[] {
  return text.slice(0, 400).split('\n')
    .filter((l) => CONTACT_LINE.test(l) || l.search(EMAIL) !== -1 || l.search(PHONE) !== -1)
    .flatMap((l) => l.replace(EMAIL, ' ').replace(PHONE, ' ').match(DOMAIN) ?? [])
}

export function buildGenerationReport(target: ReportTarget, form: ReportForm, env: ReportEnv): GenerationReport {
  // Every source's details: a user may have emptied one in the editor.
  const sources = [env.resume?.parsed, env.tailored, target.kind === 'resume' ? target.output : undefined]
  const all = (field: ContactField) => sources.flatMap((s) => [s?.[field]].flat()).filter((v): v is string => typeof v === 'string' && !!v.trim())
  const names = withShortForms([
    ...all('name'),
    ...(env.resume?.parsed?.name?.trim() ? [] : headNames(env.resume?.text ?? '')),
    ...(target.kind === 'letter' ? signedName(target.output) : []),
  ])
  const tag = (values: string[], t: string) => values.map((v): [string, string] => [v, t])
  const known = [...all('website'), ...all('links')]
  const links = known.length ? known : headerDomains(env.resume?.text ?? '')
  // A letter prompt asks for the portfolio link, which often holds the name, so
  // the user's links go from everything sent. Location only from the original
  // resume: in a letter or a resume's jobs it's part of what we want to see.
  const people = [...tag(names, '[name]'), ...tag(all('email'), '[email]'), ...tag(all('phone'), '[phone]'), ...tag(links.flatMap((l) => [l, bareLink(l)]), '[link]')]

  const sendSource = form.category === 'invented' && form.sendSource && !!env.resume?.text
  // A name only: none for a pasted posting, or one the server wouldn't take (an IP address).
  let site = ''
  try { site = new globalThis.URL(target.job.url).hostname.replace(/^www\./, '') } catch { /* pasted: no address */ }
  if (!HOST.test(site)) site = ''

  return {
    category: form.category,
    comment: form.comment.trim(),
    kind: target.kind,
    output: target.kind === 'letter'
      ? scrub(target.output, people, true).slice(0, MAX_LETTER)
      // A resume loses its contact fields, and every line left is scrubbed too:
      // a summary or a references section can name the user. Deleted sections
      // print nowhere and can be long, so they go too.
      : JSON.parse(
        JSON.stringify(Object.fromEntries(Object.entries(target.output).filter(([k]) => !(DROPPED as readonly string[]).includes(k)))),
        (_, v) => (typeof v === 'string' ? scrub(v, people, true) : v),
      ),
    job: { title: target.job.title.slice(0, MAX_JOB_FIELD), company: target.job.company.slice(0, MAX_JOB_FIELD), description: target.job.description.slice(0, MAX_DESCRIPTION), site },
    mode: env.mode,
    // Hosted letters and resumes are written by Claude whatever the BYOK setting says.
    provider: env.mode === 'hosted' ? 'claude' : env.provider,
    version: env.version,
    contact: env.mode === 'hosted' && form.contact,
    ...(sendSource && { sourceResume: withoutHeader(scrub(env.resume!.text, [...people, ...tag(all('location'), '[location]')], true)).slice(0, MAX_SOURCE) }),
  }
}

// Unless this browser's parse names the user, the resume text starts with the
// name: History's newest resume may be older, or someone else's. A PDF's text
// can run the first lines together ("Jane Doe Toronto, ON · (416) ..."), and
// a two-column template can put a sidebar first ("Contact\nToronto, ON\nJane
// Doe"). So from the first of the first five lines that has any: the text
// before any separator, digit or @, and its first two to four capitalized
// words (with particles like "van" or "de" between them). ponytail: a heading
// there ("Senior Software Engineer") is taken too, which blanks those words in
// the report.
function headNames(text: string): string[] {
  for (const line of text.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 5)) {
    const segment = line.split(/\s[|·•–-]\s|[|·•,@\d(+]/)[0].trim()
    const words = segment.split(/\s+/)
    const end = words.findIndex((w) => !/^\p{Lu}/u.test(w) && !NAME_PARTICLE.test(w))
    const caps = end === -1 ? words : words.slice(0, end)
    const names = [segment, ...[2, 3, 4].map((n) => caps.slice(0, n).join(' '))]
      .filter((n) => n.length <= 60 && n.split(/\s+/).length >= 2 && !/\b(resume|résumé|curriculum|vitae|cv)\b/i.test(n))
    if (names.length) return names
  }
  return []
}
const NAME_PARTICLE = /^(van|von|der|den|de|del|della|di|da|dos|du|la|le|bin|binti|al|el|ibn|ben|y)$/i

// The original resume's header goes whole: everything up to the last contact
// detail near the top, so a street address or postal code beside the city
// goes too. ponytail: a detail past the first 400 characters, or an address
// after the last one, stays.
function withoutHeader(text: string): string {
  const top = text.slice(0, 400)
  const end = Math.max(...['[email]', '[phone]', '[link]', '[location]'].map((t) => {
    const i = top.lastIndexOf(t)
    return i === -1 ? -1 : i + t.length
  }))
  return end > 0 ? `[contact details]${text.slice(end)}` : text
}

// A link as a letter may write it: no https://, www. or trailing slash.
const bareLink = (l: string) => l.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '')

// The name a letter signs with: the line after its closing ("Sincerely,").
// Whatever shape the resume is, this is the name as the letter writes it.
function signedName(letter: string): string[] {
  const lines = letter.split('\n').map((l) => l.trim()).filter(Boolean)
  let close = lines.length
  while (close-- > 0 && !/^(sincerely|best|regards|kind regards|best regards|warm regards|warmly|thank you|thanks|respectfully|yours truly|yours sincerely|cheers|with gratitude)\b[^.!?]{0,45},?$/i.test(lines[close]));
  const name = close === -1 ? undefined : lines[close + 1]
  return name && name.length <= 60 && !/[\d@]/.test(name) ? [name] : []
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

// Anything shaped like an email or phone number first, so a name can't eat an
// email's first half ("[name]@janedoe.dev"). Then whole-word matches of what
// we know (longest first, any case). withLinks: web addresses too.
function scrub(text: string, pairs: Array<[string, string]>, withLinks = false): string {
  text = text.replace(EMAIL, '[email]').replace(PHONE, '[phone]')
  const known = pairs.flatMap(([v, tag]) => (v && v.trim().length >= 3 ? [[v.trim(), tag] as const] : []))
    .sort((a, b) => b[0].length - a[0].length)
  for (const [value, tag] of known) {
    // Any run of spaces or line breaks between words: a PDF's text can read
    // "Jane  Doe" or "JANE\nDOE".
    const escaped = value.split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+')
    text = text.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'giu'), tag)
  }
  return withLinks ? text.replace(URL, '[link]') : text
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
