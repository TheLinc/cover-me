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
  output: string | Omit<TailoredResume, ContactField>
  job: { title: string; company: string; description: string; site: string }
  mode: AppMode
  provider: AIProvider
  version: string
  contact: boolean
  sourceResume?: string
}

const CONTACT_FIELDS = ['name', 'phone', 'email', 'website', 'links', 'location'] as const
type ContactField = (typeof CONTACT_FIELDS)[number]

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g
// A North American number, or anything after a +. Not any long run of digits:
// "2019 - 2024 2025" is dates.
const PHONE = /(?:\+\d[\d ().-]{7,}\d|\(?\b\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}\b)/g
// ponytail: only addresses that can't be anything else; a bare portfolio domain
// is caught only when the parse or tailored resume names it.
const URL = /(?:https?:\/\/|www\.)\S+|\b(?:[\w-]+\.)*(?:linkedin|github|gitlab|behance|dribbble)\.com\/\S*/gi

export function buildGenerationReport(target: ReportTarget, form: ReportForm, env: ReportEnv): GenerationReport {
  // Every source's details: a user may have emptied one in the editor.
  const sources = [env.resume?.parsed, env.tailored, target.kind === 'resume' ? target.output : undefined]
  const all = (field: ContactField) => sources.flatMap((s) => [s?.[field]].flat()).filter((v): v is string => typeof v === 'string')
  // With none of them, the resume text's first line starts with the name
  // ("Jane Doe | jane@x.com | ...").
  const head = env.resume?.text.split('\n').map((l) => l.trim()).find(Boolean)?.split(/\s[|·•–-]\s|[|·•,]/)[0].trim()
  const names = all('name').length ? all('name') : head && head.length <= 60 && !/[\d@]/.test(head) ? [head] : []
  const tag = (values: string[], t: string) => values.map((v): [string, string] => [v, t])
  const people = [...tag(names, '[name]'), ...tag(all('email'), '[email]'), ...tag(all('phone'), '[phone]')]
  const places = [...tag([...all('website'), ...all('links')], '[link]'), ...tag(all('location'), '[location]')]

  const sendSource = form.category === 'invented' && form.sendSource && !!env.resume?.text
  // A name only: none for a pasted posting, or one at an IP address.
  let site = ''
  try { site = new globalThis.URL(target.job.url).hostname.replace(/^www\./, '') } catch { /* pasted: no address */ }
  if (!/\.[a-z][a-z0-9-]*$/i.test(site)) site = ''

  return {
    category: form.category,
    comment: form.comment.trim(),
    kind: target.kind,
    output: target.kind === 'letter'
      ? scrub(target.output, people)
      // A resume loses its contact fields, and every line left is scrubbed too:
      // a summary or a references section can name the user.
      : JSON.parse(
        JSON.stringify(Object.fromEntries(Object.entries(target.output).filter(([k]) => !(CONTACT_FIELDS as readonly string[]).includes(k)))),
        (_, v) => (typeof v === 'string' ? scrub(v, people) : v),
      ),
    job: { title: target.job.title.slice(0, MAX_JOB_FIELD), company: target.job.company.slice(0, MAX_JOB_FIELD), description: target.job.description.slice(0, MAX_DESCRIPTION), site },
    mode: env.mode,
    // Hosted letters and resumes are written by Claude whatever the BYOK setting says.
    provider: env.mode === 'hosted' ? 'claude' : env.provider,
    version: env.version,
    contact: env.mode === 'hosted' && form.contact,
    ...(sendSource && { sourceResume: scrub(env.resume!.text, [...people, ...places], true).slice(0, MAX_SOURCE) }),
  }
}

// Exact matches of what we know (longest first, any case), then anything shaped
// like an email or phone number. withLinks: web addresses too.
function scrub(text: string, pairs: Array<[string, string]>, withLinks = false): string {
  const known = pairs.flatMap(([v, tag]) => (v && v.trim().length >= 3 ? [[v.trim(), tag] as const] : []))
    .sort((a, b) => b[0].length - a[0].length)
  for (const [value, tag] of known) text = text.replace(new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), tag)
  text = text.replace(EMAIL, '[email]').replace(PHONE, '[phone]')
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
