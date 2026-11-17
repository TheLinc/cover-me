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
// from the parse, the tailored resume, or guessedDomains.
const URL = /(?:https?:\/\/|www\.)[^\s"'”’]*[^\s.,;:!?)"'”’]|\b(?:[\w-]+\.)*(?:linkedin|github|gitlab|behance|dribbble)\.com\/(?:[^\s"'”’]*[^\s.,;:!?)"'”’])?/gi
// A domain with a common site ending (lowercase, so "ASP.NET" stays out; the
// list keeps "Node.js" out), an optional country part ("com.br"), and its path.
const DOMAIN = /\b[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.(?:com|dev|io|me|net|org|co|ca|app|page|site|xyz|tech|ai|design|blog|info|studio|art|tv|pro|online|cc|gg|so|to|ie|uk|us|de|fr|au|in|nl|it|es|se|ch|eu)(?:\.[a-z]{2})?\b(?:\/(?:[^\s·|,]*[^\s·|,.;:!?)])?)?/g
// A domain after a label: "Portfolio pixelforge.studio", "Homepage: ...",
// "Portfolio — https://...", "Portfolio 🌐 ...".
const LABELLED = new RegExp(String.raw`\b(?:portfolio|website|web|site|homepage|blog|links?|url)\b[\s:—–|•·-]*(?:[^\w\s]{1,3}\s*)?(?:https?:\/\/)?(?:www\.)?(${DOMAIN.source})`, 'gi')
// Any domain, any ending or case: only for the name check, where the name
// already keeps "Node.js" out.
const ANY_DOMAIN = /\b[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b(?:\/(?:[^\s·|,]*[^\s·|,.;:!?)])?)?/g
// Sites anyone has a page on: their names stay when a profile on them goes.
const PLATFORM = /^(?:www\.)?(?:linkedin|github|gitlab|medium|behance|dribbble|twitter|x|instagram|youtube|kaggle|substack|notion|dev|codepen|bitbucket|huggingface|hashnode)\.(?:com|to|so|in|net|io|org|co|dev)$/i
const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

// Domains the user's own, besides the known links, from signals a skills list
// or an employer line can't give: on a line with an email or phone near the
// resume's top, after a label there, or holding a word of the user's name
// anywhere in the resume or the letter ("janedoe.dev", "behance.net/janedoe";
// accents ignored, any ending). One from a contact line or a label also goes
// without its path, unless it's a profile on a platform ("medium.com" is
// anyone's). ponytail: a domain that
// spells no name, alone on a line or after an icon, is left: it reads the same
// as a skill ("Socket.io") or an employer ("Shopify.com").
// output: the letter, or the tailored resume's text, also searched for names.
function guessedDomains(text: string, output: string, names: string[]): string[] {
  const top = text.slice(0, 400)
  const contact = top.split('\n').filter((l) => l.search(EMAIL) !== -1 || l.search(PHONE) !== -1)
    .flatMap((l) => l.replace(EMAIL, ' ').replace(PHONE, ' ').match(DOMAIN) ?? [])
  const labelled = [...top.matchAll(LABELLED)].map((m) => m[1])
  // Each name word, and the whole name run together either way round, so
  // "Yu Li" finds yuli.dev and liyu.dev.
  const words = [...new Set(names.flatMap((n) => {
    const parts = plain(n).split(/[^\p{L}]+/u).filter(Boolean)
    return [...parts, parts.join(''), [...parts].reverse().join('')]
  }).filter((w) => w.length >= 3))]
  const named = `${text}\n${output}`.replace(EMAIL, ' ').match(ANY_DOMAIN)?.filter((d) => words.some((w) => plain(d).includes(w))) ?? []
  const host = (d: string) => d.split('/')[0]
  return [...[...contact, ...labelled].flatMap((d) => (PLATFORM.test(host(d)) ? [d] : [d, host(d)])), ...named]
}

export function buildGenerationReport(target: ReportTarget, form: ReportForm, env: ReportEnv): GenerationReport {
  // Every source's details: a user may have emptied one in the editor.
  const sources = [env.resume?.parsed, env.tailored, target.kind === 'resume' ? target.output : undefined]
  const all = (field: ContactField) => sources.flatMap((s) => [s?.[field]].flat()).filter((v): v is string => typeof v === 'string' && !!v.trim())
  const names = withShortForms([
    ...all('name'),
    // Also with a parse, as the header may write the name differently ("Jane A.
    // Doe", 'Jonathan "Jon" Smith'), but then only one sharing a word with the
    // parse's, so a job title under a stacked name isn't taken. (History's
    // name may be someone else's, so it doesn't filter.)
    ...headNames(env.resume?.text ?? '').filter((h) => !env.resume?.parsed?.name?.trim() || sharesWord(h, [env.resume.parsed.name])),
    ...(target.kind === 'letter' ? signedName(target.output) : []),
  ])
  const tag = (values: string[], t: string) => values.map((v): [string, string] => [v, t])
  // Known links and guessed ones together: History's resume may be older, or
  // someone else's.
  const links = [...all('website'), ...all('links'), ...guessedDomains(env.resume?.text ?? '', target.kind === 'letter' ? target.output : stringsOf(target.output).join('\n'), names)]
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
    // Addresses first: a ZIP is found by the state beside it, which the
    // location replacement would take.
    ...(sendSource && { sourceResume: scrub(withoutAddress(env.resume!.text), [...people, ...tag([...all('location'), ...contactPlaces(env.resume!.text)], '[location]')], true).slice(0, MAX_SOURCE) }),
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

// Canadian provinces and territories, US states, territories and military
// codes: a US ZIP follows one of these.
const STATES = 'AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT|AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|PR|GU|VI|AS|MP|AA|AE|AP'
// A city's region: those, or a common country code ("London, UK").
const REGIONS = `${STATES}|UK|USA|US|AU|NZ|IE|DE|FR|NL|ES|IT|SE|CH|SG|BR|MX|JP`
// Words that can't be anything but a street, so a year may number one
// ("2000 Pennsylvania Avenue"), and words that can ("2023 Year End Close").
const STREETS = 'Street|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Crescent|Cres|Parkway|Pkwy|Highway|Hwy'
const STREETS_OR_WORDS = `${STREETS}|St|Drive|Dr|Way|Court|Ct|Place|Pl|Terrace|Close|Square|Sq|Circle|Cir|Trail|Trl`
const street = (words: string, number: string) => String.raw`\b${number}[A-Za-z]?(?:[ \t]+(?:[A-Z][\w'.-]*|\d+(?:st|nd|rd|th|ST|ND|RD|TH))){1,4}[ \t]+(?:${words}|${words.toUpperCase()})\b\.?(?:,?[ \t]*(?:Apt|Unit|Suite|APT|UNIT|SUITE|#)[ \t]*[\w-]+)?`
// A street address, and a postal code (Canadian, UK, or a US ZIP after a
// state), wherever they sit in the original resume. Nothing is cut around
// them: guessing where a header ends broke the summary in too many layouts.
// A year numbers only a street word that can't be an ordinary one, so
// "Hackathon 2023 First Place" and "2023 Year End Close" stay; a word may be
// an ordinal or a direction ("350 5th Avenue", "123 W 42nd St"); an all-caps
// address counts too. ponytail: an address without a number and street word
// ("Flat B, Rose Court"), or with a full state name before its ZIP ("Austin,
// Texas 78701"), stays.
const ADDRESS = new RegExp(`${street(STREETS_OR_WORDS, String.raw`(?!(?:19|20)\d\d\b)\d{1,6}`)}|${street(STREETS, String.raw`(?:19|20)\d\d`)}`, 'g')
const POSTAL = new RegExp(String.raw`\b[A-Z]\d[A-Z][ ]?\d[A-Z]\d\b|\b[A-Z]{1,2}\d[A-Z\d]?[ ]\d[A-Z]{2}\b|\b(?:${STATES})[ \t]+\d{5}(?:-\d{4})?\b`, 'g')
const withoutAddress = (text: string) => text.replace(ADDRESS, '[address]').replace(POSTAL, (m) => (/^[A-Z]{2}\s+\d/.test(m) ? `${m.slice(0, 2)} [postal code]` : '[postal code]'))

// The header's location, besides any the parse names: the first city with its province or
// state ("Toronto, ON") near the top, on a line holding an email, phone,
// address or postal code, or alone on its line (Word stacks the header). Only
// a real province or state, so "Manager, HR" and "React, UI" stay. A PDF can
// run the header into the jobs, so the match can carry words before the city
// ("Jane Doe Toronto, ON"); each shorter ending goes too, so a job line's
// "Contoso Retail Toronto, ON" loses only "Toronto, ON".
const PLACE = new RegExp(String.raw`\b\p{Lu}[\p{L}'.-]+(?:[ ]\p{Lu}[\p{L}'.-]+){0,2},[ ]?(?:${REGIONS})\b`, 'gu')
function contactPlaces(text: string): string[] {
  const line = text.slice(0, 400).split('\n').find((l) =>
    [EMAIL, PHONE, ADDRESS, POSTAL].some((p) => l.search(p) !== -1) ? l.search(PLACE) !== -1 : l.trim().replace(PLACE, '') === '' && l.trim() !== '')
  const place = line?.match(PLACE)?.[0]
  if (!place) return []
  const comma = place.lastIndexOf(',')
  const words = place.slice(0, comma).split(' ')
  return words.map((_, i) => words.slice(i).join(' ') + place.slice(comma))
}

const nameWords = (n: string) => plain(n).split(/[^\p{L}]+/u).filter((w) => w.length >= 2)
const sharesWord = (h: string, known: string[]) => nameWords(h).some((w) => known.some((k) => nameWords(k).includes(w)))

// Every string in a resume, as written (JSON would turn a line break into "\n",
// gluing an "n" to the next word).
const stringsOf = (v: unknown): string[] => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(stringsOf) : [])

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
