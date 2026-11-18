import type { AIProvider, AppMode, JobData, ParsedResume, TailoredResume } from '../types'
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config'

// "Flag a problem" on a cover letter (popup) or a tailored resume (editor tab),
// #256. One press sends the output and its posting to the generation-report
// Edge Function, which adds one response to a PostHog survey. The user's
// details are taken out here, so they never leave the browser: their name,
// email, phone, links, location, street address and postal code.
//
// They come from the user's parsed resume (read for the report:
// report-resume.ts), and the original resume is sent as that parse, never as
// its text. Patterns are the safety net under the known values: any web
// address, email, or phone-shaped number goes, whoever it belongs to.

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
// Extra sections that hold nothing but personal details (or other people's),
// in the languages resumes most often come in (Chinese, Japanese and Korean
// headings have no word edges). "Personal Projects" stays.
const PERSONAL_SECTION = /\b(?:contacts?|contact (?:info(?:rmation)?|details)|personal (?:details|data|info(?:rmation)?|particulars|profile)|bio[- ]?data|declaration|r[eé]f[eé]r[eêé]n\w*|referees|^\s*personal\s*$|informaci[oó]n personal|dati personali|e?tat civil|informa[çc][õo]es pessoais|address(?:es)?|kontakt\w*|persönliche (?:daten|angaben)|pers[öo]nliches|datos personales|datos de contacto|dados pessoais|informations personnelles|coordonnées|personalia|persoonlijke gegevens|dane osobowe|personuppgifter)\b|個人情報|連絡先|个人信息|個人資料|个人资料|基本信息|联系方式|인적\s?사항|개인\s?정보|연락처/iu
// A line in any other extra section that holds a personal detail: a labelled
// one ("Date of Birth: ...", "Adres: ...", "DNI: ...") or one with a phone,
// email or address the scrub replaced. Kept: the rest of the section
// ("Languages: Spanish"), and a line only placed in the user's city.
const PERSONAL_LINE = new RegExp(String.raw`^\s*(?:(?:permanent|home|residential|current|present|postal|mailing|local|correspondence)\s+)?(?:(?:address|adres|adresse|dirección|direccion|endereço|indirizzo|woonplaats|wohnort|anschrift|date of birth|dob|d\.o\.b|birth ?date|birth ?place|place of birth|geburtsdatum|geburtsort|geboren|fecha de nacimiento|data de nascimento|né(?:e)? le|nationality|nationalität|staatsangehörigkeit|nacionalidad|citizenship|geschlecht|marital status|familienstand|estado civil|father'?s name|mother'?s name|passport|dni|ssn|social security|national id|id (?:no|number)|aadhaar|pesel|cpf|visa status)\b[^:：]{0,20}|(?:city|place|location|ort|ciudad|cidade|born|gender|sex|religion|spouse|pan|nie|nif|bsn|rg)[ \t]*(?:\([^)]*\))?[ \t]*)(?:[:：]|[ \t]+[-–—][ \t])|^\s*(?:地址|住址|通讯地址|出生日期|出生|籍贯|电话|電話|手机|邮箱|身份证|民族|주소|생년월일|전화|휴대폰|이메일|住所|生年月日|電話番号)[^:：]{0,6}[:：]`, 'iu')
// Or one that starts with a birth, without a label ("Born 1995 in Leeds").
const BIRTH_LINE = /^\s*(?:born\s+(?:on\b|in\b|\d)|(?:dob|d\.o\.b|nacid[oa]|nascid[oa]|nat[oa] a|née|né le|geboren)(?!\p{L}))/iu
const TAG_LINE = /\[(?:phone|email|address)\]/
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
      ? scrub(withoutLetterBlocks(target.output.slice(0, 2 * MAX_LETTER)), known).slice(0, MAX_LETTER)
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

// A resume without its contact fields, deleted sections, Word file hash,
// personal sections or personal lines, every line scrubbed: a summary or a
// bullet can name the user.
function scrubResume(resume: object, known: Known): Resume {
  const kept = Object.fromEntries(Object.entries(resume).filter(([k]) => !DROPPED.includes(k)))
  const scrubbed = JSON.parse(JSON.stringify(kept), (_, v) => (typeof v === 'string' ? scrub(v, known) : v)) as Resume
  if (Array.isArray(scrubbed.otherSections)) {
    scrubbed.otherSections = (scrubbed.otherSections as Array<{ heading?: unknown; lines?: unknown }>)
      .filter((s) => !(typeof s?.heading === 'string' && PERSONAL_SECTION.test(s.heading)))
      .map((s) => (Array.isArray(s.lines) ? { ...s, lines: s.lines.filter((l) => !(typeof l === 'string' && (PERSONAL_LINE.test(l) || BIRTH_LINE.test(l) || TAG_LINE.test(l)))) } : s))
  }
  return scrubbed
}

interface Known { names: string[]; nameWords: string[]; emails: string[]; phones: string[]; links: string[]; places: string[]; placeWords: string[] }

// The user's details: the parse's, the tailored resume's own (a reported resume
// may hold an edited name), the account's email, and the name a letter signs with.
function knownDetails(target: ReportTarget, env: ReportEnv): Known {
  const sources: Array<Partial<Record<ContactField, unknown>> | undefined> = [env.parsed, target.kind === 'resume' ? target.output : undefined]
  const field = (f: ContactField) => sources.flatMap((s) => [s?.[f]].flat()).filter((v): v is string => typeof v === 'string' && !!v.trim()).map((v) => v.trim())
  const names = [...new Set(withShortForms([...field('name'), ...(target.kind === 'letter' ? signedName(target.output) : [])]).flatMap(spellings))]
  // "Remote" or "Hybrid" alone is no place.
  const places = field('location').filter((p) => !p.split(/[^\p{L}]+/u).filter(Boolean).every((w) => AROUND_PLACE.has(w.toLowerCase())))
  return {
    names,
    // Each part of the name alone, as written ("Jane", "Doe"): a letter can use
    // just one. Capitalized only (or in a script without capitals), so the word
    // "will" stays for a "Will".
    nameWords: [...new Set(names.flatMap((n) => n.split(/[\s"'“”‘’().,-]+/)).filter((w) => (/^\p{Lu}/u.test(w) || caseless(w)) && w.replace(/\P{L}/gu, '').length >= 2))],
    emails: [...field('email'), ...(env.accountEmail ? [env.accountEmail] : [])],
    phones: field('phone'),
    links: [...field('website'), ...field('links')].flatMap((l) => [l, bareLink(l), ...handleOf(l)]),
    places,
    placeWords: placeWords(places),
  }
}

// The places in a location, however the parse wrote it ("Toronto, ON",
// "Greater Toronto Area", "Toronto ON M5V 2T6", "London / Remote", "Rohini,
// New Delhi"): each run of capitalized words without the words around a place
// ("Greater", "Area", "Remote"); its last word alone after New, San and the
// like ("Delhi", "Francisco", but not "Spring" for Silver Spring); its first
// words before a particle ("Newcastle" upon Tyne); and each half of a
// hyphenated name. Capitalized only, so "reading" stays for a user in Reading. Not taken
// alone: region codes ("ON", "NSW") and countries, states and provinces, which
// go with the city beside them but name no one ("Air Canada" stays).
const AROUND_PLACE = new Set(['greater', 'area', 'bay', 'metro', 'metropolitan', 'region', 'remote', 'hybrid', 'onsite', 'office', 'city', 'county', 'district', 'the', 'of', 'and', 'or'])
const PLACE_PARTICLE = /^(?:de|del|la|le|los|las|di|da|do|dos|du|am|an|im|upon|on)$/
const CITY_PREFIX = /^(?:New|San|Santa|Santo|São|Sao|Saint|St\.?|Los|Las|El|La|Le|Port|Puerto|Nueva|Nuevo|Navi|North|South|East|West)$/
const REGION_NAMES = new Set([
  'canada', 'usa', 'america', 'united states', 'states', 'mexico', 'brazil', 'argentina', 'chile', 'colombia', 'peru', 'uk', 'united kingdom', 'kingdom', 'england', 'scotland', 'wales', 'ireland', 'france', 'germany', 'deutschland', 'spain', 'españa', 'portugal', 'italy', 'italia', 'netherlands', 'belgium', 'switzerland', 'austria', 'sweden', 'norway', 'denmark', 'finland', 'poland', 'czechia', 'greece', 'turkey', 'russia', 'ukraine', 'india', 'pakistan', 'bangladesh', 'sri lanka', 'nepal', 'china', 'japan', 'korea', 'singapore', 'malaysia', 'indonesia', 'philippines', 'vietnam', 'thailand', 'australia', 'zealand', 'new zealand', 'south africa', 'africa', 'nigeria', 'kenya', 'egypt', 'ghana', 'israel', 'emirates', 'uae', 'saudi arabia', 'europe', 'asia',
  'ontario', 'quebec', 'british columbia', 'columbia', 'alberta', 'manitoba', 'saskatchewan', 'nova scotia', 'new brunswick', 'newfoundland', 'labrador', 'yukon', 'nunavut',
  'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire', 'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina', 'south dakota', 'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'west virginia', 'wisconsin', 'wyoming',
  'maharashtra', 'karnataka', 'tamil nadu', 'kerala', 'gujarat', 'rajasthan', 'punjab', 'haryana', 'telangana', 'bengal', 'west bengal', 'uttar pradesh', 'bavaria', 'bayern', 'catalonia', 'cataluña', 'andalusia', 'queensland', 'victoria', 'new south wales', 'nsw', 'tasmania',
])
const REGION_AFTER_PLACE = new RegExp(String.raw`\[location\](?:,?[ \t]+(?:${[...REGION_NAMES].sort((a, b) => b.length - a.length).map((r) => r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '[ \\t]+')).join('|')})(?![\p{L}])(?:[ \t]+\d{4,6}\b)?)+`, 'giu')
// A city's other spellings, which a letter in English may use instead.
// ponytail: the common ones only; add a city when a report shows it missing.
const EXONYMS = [['München', 'Munich'], ['Köln', 'Cologne'], ['Wien', 'Vienna'], ['Praha', 'Prague'], ['Warszawa', 'Warsaw'], ['Kraków', 'Cracow'], ['Lisboa', 'Lisbon'], ['Roma', 'Rome'], ['Milano', 'Milan'], ['Napoli', 'Naples'], ['Firenze', 'Florence'], ['Torino', 'Turin'], ['Sevilla', 'Seville'], ['Genève', 'Geneva'], ['Den Haag', 'The Hague'], ['Bruxelles', 'Brussels'], ['Antwerpen', 'Antwerp'], ['København', 'Copenhagen'], ['Göteborg', 'Gothenburg'], ['Moskva', 'Moscow'], ['Bengaluru', 'Bangalore'], ['Mumbai', 'Bombay'], ['Chennai', 'Madras'], ['Kolkata', 'Calcutta'], ['Gurugram', 'Gurgaon'], ['Beijing', 'Peking'], ['Ciudad de México', 'Mexico City'], ['São Paulo', 'Sao Paulo']]
const deaccent = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '')
function placeWords(places: string[]): string[] {
  const out = new Set<string>()
  for (const written of places) {
    // "calgary, alberta" as "Calgary, Alberta", so its words count as capitalized.
    const place = written === written.toLowerCase() ? written.replace(/\p{L}+/gu, (w) => (PLACE_PARTICLE.test(w) ? w : w[0].toUpperCase() + w.slice(1))) : written
    place.split(/\s*[,;·|/–—()[\]]\s*|\s+-\s+/).filter(Boolean).forEach((part, partIndex) => {
      // "上海市浦东新区" as written, and "上海" alone.
      if (caseless(part)) [part, ...part.split(/[市省都府県区縣县道]/)].filter((p) => p.length >= 2).forEach((p) => out.add(p))
      // Runs of capitalized words (with particles inside: "Rio de Janeiro").
      const words = part.split(/\s+/)
      let run: string[] = []
      let first = partIndex === 0
      const flush = () => {
        const whole = run.join(' ')
        while (run.length && AROUND_PLACE.has(run[0].toLowerCase())) run.shift()
        while (run.length && (AROUND_PLACE.has(run[run.length - 1].toLowerCase()) || PLACE_PARTICLE.test(run[run.length - 1]))) run.pop()
        // A country or state after the city ("Lagos Nigeria", "New Delhi India").
        for (let n = 2; n >= 1; n--) {
          if (run.length > n && REGION_NAMES.has(run.slice(-n).join(' ').toLowerCase())) run.splice(-n)
        }
        const name = run.join(' ')
        const last = run[run.length - 1] ?? ''
        // The location's first place is the city even when it's also a
        // region's name ("Washington, DC", "Singapore 018956", "Mexico City").
        if (name.replace(/\P{L}/gu, '').length >= 3 && (first || !REGION_NAMES.has(name.toLowerCase()))) out.add(name).add(whole)
        if (run.length > 1 && CITY_PREFIX.test(run[0]) && last.replace(/\P{L}/gu, '').length >= 4 && !REGION_NAMES.has(last.toLowerCase())) out.add(last)
        // "Newcastle" for "Newcastle upon Tyne", "Rio" for "Rio de Janeiro".
        const particle = run.findIndex((w) => PLACE_PARTICLE.test(w))
        if (particle > 0) out.add(run.slice(0, particle).join(' '))
        // "Kitchener-Waterloo": each city alone, and "Winston Salem".
        for (const w of run.filter((w) => w.includes('-'))) {
          out.add(w.replace(/-/g, ' '))
          for (const piece of w.split('-')) if (piece.length >= 4 && !REGION_NAMES.has(piece.toLowerCase())) out.add(piece)
        }
        if (name) first = false
        run = []
      }
      for (const w of words) {
        if (/^\p{Lu}[\p{L}'.-]*$/u.test(w) && !/^[A-Z]{2,3}$/.test(w)) run.push(w)
        else if (run.length && PLACE_PARTICLE.test(w)) run.push(w)
        else flush()
      }
      flush()
    })
  }
  // Without accents ("Munchen") and by the city's other name ("Munich").
  for (const p of [...out]) {
    out.add(deaccent(p))
    for (const pair of EXONYMS) if (pair.some((n) => deaccent(n).toLowerCase() === deaccent(p).toLowerCase())) pair.forEach((n) => out.add(n).add(deaccent(n)))
  }
  return [...out]
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
  const greeting = lines.slice(0, 25).findIndex((l) => /^\s*(?:dear|hello|hi|hey|to whom|to the|greetings|good (?:morning|afternoon|day)|hiring (?:manager|team)|attn|attention)\b/i.test(l))
  const text = greeting > 0 && lines.slice(0, greeting).some((l) => l.trim()) ? `[contact details]\n\n${lines.slice(greeting).join('\n')}` : letter
  // The signature: everything after the last closing line in the letter's last
  // lines ("Sincerely,", "Best regards, Jane Doe"), keeping the closing and
  // any postscript ("P.S. ...", scrubbed like the rest). Without a closing,
  // only a last line that reads as a name. Body text is never cut.
  const ls = text.split('\n')
  // A closing alone ("Sincerely,"), or followed by a name ("Best regards, Jane
  // Doe"), not a body sentence ("In short, I'd love to talk.").
  const isClosing = (l: string) => /^[\p{L}' ]{3,40},(?:\s+\p{Lu}[\p{L}'.-]*(?:\s+\p{Lu}[\p{L}'.-]*){0,3})?$/u.test(l.trim())
  // After body text, so the greeting ("Dear Hiring Manager,") isn't taken.
  const isGreeting = (l: string) => /^\s*(?:dear|hello|hi|hey|to whom|to the|greetings|good (?:morning|afternoon|day)|hiring (?:manager|team)|attn|attention)\b/i.test(l)
  let close = -1
  for (let i = ls.length - 1; i >= Math.max(0, ls.length - 10); i--) {
    if (isClosing(ls[i]) && !isGreeting(ls[i]) && ls.slice(0, i).some((l) => /[.!?:]\s*$/.test(l.trim()))) { close = i; break }
  }
  if (close !== -1) {
    const [, closing, rest] = ls[close].trim().match(/^([\p{L}' ]{3,40},)\s*(.*)$/u)!
    const ps = ls.findIndex((l, i) => i > close && /^\s*P\.?\s?S\b/i.test(l))
    const after = ps === -1 ? [] : ls.slice(ps)
    return [...ls.slice(0, close), rest ? `${closing} [signature]` : `${closing}\n[signature]`, ...(after.length ? ['', ...after] : [])].join('\n')
  }
  const filled = ls.map((l) => l.trim()).filter(Boolean)
  const last = filled[filled.length - 1] ?? ''
  if (ls.length > 1 && /^\p{Lu}[\p{L}'.-]*(?:\s+\p{Lu}[\p{L}'.-]*){1,3}$/u.test(last)) return text.replace(new RegExp(`${last.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`), '[signature]')
  return text
}

const EMAIL = /[\w.+-]{1,64}@[\w-]+(?:\.[\w-]+)+/g
// "jane [at] example [dot] com", "jane(at)example.com", "jane at example dot com".
const OBFUSCATED_EMAIL = /[\w.+-]{1,64}\s*(?:\[\s*at\s*\]|\(\s*at\s*\)|\{\s*at\s*\})\s*[\w-]+(?:\s*(?:\[\s*dot\s*\]|\(\s*dot\s*\)|\{\s*dot\s*\}|\.)\s*[\w-]+)+|\b[\w.+-]{1,64}\s+(?:at|AT)\s+[\w-]+(?:\s+(?:dot|DOT)\s+[\w-]+)+/gi
const URL = /\b(?:https?:\/\/|www\.)[^\s"'”’<>]*[^\s.,;:!?)"'”’<>]/gi
// Any domain with a real ending, lowercase, and its path. "Node.js", "ASP.NET"
// and file names ("README.md") don't match; ALLOWED are tech names shaped like
// domains. An ending that's also a file extension or a word ("libfoo.so",
// "main.cc") counts only with a path ("notion.so/jane"). ponytail: an employer
// named by its site ("Booking.com") goes too.
const TLDS = 'com|net|org|edu|gov|io|ai|dev|app|co|me|tv|cc|gg|so|to|ly|ee|fm|vc|xyz|tech|site|online|page|blog|design|studio|art|pro|info|biz|cloud|digital|live|space|website|codes|software|works|world|life|email|link|cv|id|uk|us|ca|au|nz|ie|de|fr|nl|es|it|se|ch|eu|in|jp|br|mx|sg|be|at|dk|no|fi|pl|pt|cz|za|ar|cl|hk|my|ph|tw|kr|cn|ru|tr|il|ae|ng|ke|pk|bd|lk|np|vn|th'
const DOMAIN = new RegExp(String.raw`(?<![\w@.-])(?:[A-Za-z0-9-]+\.)+(?:${TLDS})(?![\w-])(?:\/[^\s"'”’<>]*[^\s.,;:!?)"'”’<>])?`, 'g')
const ALLOWED = new Set(['b.tech', 'm.tech', 'b.com', 'm.com', 'socket.io', 'fast.ai', 'asp.net', 'vb.net', 'ado.net', 'draw.io', 'dot.net', 'scikit-learn.org'])
const PATH_ONLY_ENDINGS = new Set(['so', 'cc', 'in', 'it', 'at', 'be', 'no', 'to', 'id', 'my', 'is'])
// "GitHub: pixelcat", "Twitter: @pixelcat", "LinkedIn: in/pixelcat". Only
// platforms with handles: "Web: HTML" or "Medium: blog posts" in a skills
// list stays (a web address after them goes anyway).
const HANDLE_LABEL = /\b(GitHub|GitLab|Twitter|LinkedIn|Instagram|Kaggle|Behance|Dribbble|Telegram|Skype|Discord|Mastodon|Threads|TikTok|YouTube|Bluesky|Codepen|LeetCode|HackerRank|Stack Overflow)(\s*[:：]\s*)(?!\[)[^\s,;|·]+/gi
const HANDLE = /(?<![\w@.])@[A-Za-z0-9_](?:[A-Za-z0-9_.]{0,28}[A-Za-z0-9_])?/g
// A phone number in any country's format: 8 to 15 digits starting with +, (,
// 0, or as a North American number. Never years ("2019 - 2024 2025") or a
// figure before them ("from 32 to 61 (2022-2023)").
// Nor dates ("03.2019 - 11.2021", "12.04.1995") or an amount after a
// currency sign ("$2 500 000 000").
const PHONE_SHAPE = /(?:\+\s?\d|\(\d|\b\d)[\d \t()./-]{6,22}\d/g
const isPhone = (m: string, at: number, text: string) => {
  const digits = m.replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15 || /^\d{5}-\d{3}$/.test(m)) return false // a Brazilian postcode
  if (/[$€£¥₹]\s?$/.test(text.slice(Math.max(0, at - 2), at))) return false
  const groups = m.split(/[^\d]+/).filter(Boolean)
  if (groups.every((g) => /^(?:19|20)\d\d$/.test(g))) return false
  if (groups.length > 2 && groups.slice(-2).every((g) => /^(?:19|20)\d\d$/.test(g))) return false
  if (/\b(?:0?[1-9]|1[0-2]|[0-3]?\d[./-](?:0?[1-9]|1[0-2]))[./-](?:19|20)\d\d\b/.test(m)) return false
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
// End Close cycles", "Achieved 5 Day Close") counts only where an address
// starts (a line, a separator, "Address", "at") and ends: a separator, the
// line's end, or a city and its region or postcode ("14 Elm Grove, Bristol",
// "12 Main St. Springfield IL").
const street = (words: string, number: string, end = '') => String.raw`\b${number}[A-Za-z]?(?:[ \t]+(?:[A-Z][\w'.-]*|\d+(?:st|nd|rd|th|ST|ND|RD|TH))){1,4}[ \t]+(?:${words}|${words.toUpperCase()})\b\.?(?:[ \t]+(?:[NSEW]|NE|NW|SE|SW|North|South|East|West)\b\.?)?(?:,?[ \t]*(?:Apt|Unit|Suite|APT|UNIT|SUITE|#)[ \t]*[\w-]+)?${end}`
const ADDRESS_START = String.raw`(?<=(?:^|[,|·;:/(\n]|\b(?:Address|ADDRESS|address|at|in|live|lives|living|reside|resides))[ \t]{0,3})`
const ADDRESS_END = String.raw`(?=[ \t]*(?:[,·|;\r\n]|$)|(?:[ \t]+\p{Lu}[\p{L}'.-]*){1,3},?[ \t]+[A-Z\d])`
const ADDRESSES = [
  new RegExp(`${street(STREETS, String.raw`${ADDRESS_START}\d{1,6}`)}|${street(STREETS, String.raw`\d{1,6}`, ADDRESS_END)}|${street(STREET_OR_WORD, String.raw`${ADDRESS_START}(?!(?:19|20)\d\d\b)\d{1,6}`, ADDRESS_END)}`, 'gu'),
  // The street's name is capitalized: "Via automated testing, 30" stays.
  /\b(?:Calle|C\/|Carrer|Avenida|Avda\.?|Rua|Via|Viale|Corso|Piazza|Plaza|Plaça|Paseo|Strada|Ulica|ul\.)\s+(?:(?:de|del|la|las|los|di|da|do|dos|das)\s+)*\p{Lu}[\p{L}'.-]*(?:\s+(?:(?:de|del|la|las|los|di|da|do|dos|das)\s+)*\p{Lu}[\p{L}'.-]*){0,4},?\s+\d{1,5}[A-Za-z]?\b/gu,
  /\b[\p{L}-]{0,40}(?:straße|strasse|str\.|straat|weg|gasse|platz|allee|laan|gracht|vej|gatan|gata|katu|damm)\s+\d{1,5}[a-z]?\b/giu,
  /\b\d{1,5}(?:\s?(?:bis|ter))?,?\s+(?:rue|avenue|boulevard|bd|allée|chemin|impasse|quai|place)\s+(?:(?:de|du|des|la|le|l')\s*)*\p{Lu}[\p{L}'-]+(?:[ -]\p{Lu}[\p{L}'-]+)*/gu,
  // A flat or house number that starts an address part and is followed by
  // more of it ("Flat 402, Sunrise"; "Sharma, House No. 45, Sector 15"), so
  // "Unity3D", "Adobe Creative Suite 6" and "Unit 8200" stay.
  /(?<=(?:^|[,|·;\n])[ \t]{0,3})(?:House|Flat|Plot|Door|Apartment|Apt|Unit|Suite|Block|H\.?\s?No\.?)\s+(?:No\.?\s*)?\d[\w/-]*(?=[ \t]*[,\r\n])/gu,
  /\bSector\s+\d{1,3}\b/g,
]
// Postal codes: Canadian, UK, US and Australian (after a state code), Dutch
// and Polish (before a city: "3511 AX Utrecht", "00-590 Warszawa"), Irish
// ("D02 X285"), Brazilian ("01310-100") and Japanese ("〒150-0002").
// Others go when they sit beside the user's city (see scrub).
const POSTAL = new RegExp(String.raw`\b[A-Z]\d[A-Z][ ]?\d[A-Z]\d\b|\b[A-Z]{1,2}\d[A-Z\d]?[ ](?!\d[KMGTP]B\b)\d[A-Z]{2}\b|(?<=,[ \t]?)(?:${STATES})[ \t]+\d{5}(?:-\d{4})?\b|\b(?!ID|IN|OR|ME|OK|HI|AS|DE)(?:${STATES})[ \t]+\d{5}(?:-\d{4})?\b|\b(?:NSW|VIC|QLD|SA|WA|TAS|NT|ACT)[ \t]+(?!(?:19|20)\d\d\b)\d{4}\b|(?<=(?:^|[,|·;\n])[ \t]?)(?!(?:19|20)\d\d)[1-9]\d{3}[ ]?(?!SA|SD|SS)[A-Z]{2}(?=[ \t]+\p{Lu}\p{Ll})|\b\d{2}-\d{3}(?=[ \t]+\p{Lu}\p{Ll}+(?:[ \t]+\p{Lu}\p{Ll}+)?[ \t]*(?:[,;|·\r\n]|$))|\b[AC-FHKNPRTV-Y]\d{2}[ ]?(?=\d{0,3}[AC-FHKNPRTV-Y])[AC-FHKNPRTV-Y\d]{4}\b|\b\d{5}-\d{3}\b|〒[ ]?\d{3}-\d{4}\b|\b\d{3}-\d{4}(?=[ \t]*\p{Script=Han})`, 'gu')
// A Japanese address: prefecture, ward and block numbers.
const JP_ADDRESS = /[\p{Script=Han}]{1,4}[都道府県][\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]*[\d０-９-－]+/gu

const LOCATION_NEIGHBOURS = new RegExp(String.raw`(?:\b\d{3}[ ]\d{2}[ \t]+|\b(?!(?:19|20)\d\d\b)\d{4,6}[ \t]+)?\[location\](?:,?[ \t]*\b(?:${STATES}|NSW|VIC|QLD|SA|WA|TAS|ACT|UK|USA|US|UAE)\b(?:[ \t]+\d{4,6}\b)?)?(?:[ \t]*-[ \t]*(?!(?:19|20)\d\d\b)\d{4,6}\b|[ \t]+(?!(?:19|20)\d\d\b)\d{4,6}\b)?(?:,?[ \t]*\[postal code\])?`, 'g')
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Whole words, any run of spaces between them ("Jane  Doe", "JANE\nDOE").
const wordsPattern = (v: string) => `(?<![\\p{L}\\p{N}])${v.trim().split(/\s+/).map(escape).join('\\s+')}(?![\\p{L}\\p{N}])`
const byLength = (a: string, b: string) => b.length - a.length
// A capitalized word as written, in capitals, and in title case (a parse
// that wrote "JANE DOE" still finds "Jane"), but never in lower case.
// Chinese, Japanese, Arabic and other scripts without capitals, which a
// name is matched in without word edges (no spaces between words in CJK).
const caseless = (s: string) => !/[\p{Lu}\p{Ll}]/u.test(s)
const namePattern = (n: string) => (caseless(n) ? n.trim().split(/\s+/).map(escape).join('\\s*') : wordsPattern(n))
// A name as a letter may spell it: "José Núñez" as "Jose Nunez", "Jürgen
// Müller" as "Juergen Mueller".
const UMLAUTS: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', Ä: 'Ae', Ö: 'Oe', Ü: 'Ue', ß: 'ss' }
const spellings = (s: string) => [s, deaccent(s), deaccent(s.replace(/[äöüÄÖÜß]/g, (c) => UMLAUTS[c]))]
const cases = (w: string) => [...new Set([w, w.toUpperCase(), w.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, p: string, c: string) => p + c.toUpperCase())])]
// A known phone by its digits, in any format, with or without its country
// code, area code or a leading 0 ("+44 7700 900123", "07700 900123",
// "612 345 678" for +34, "555-0199" for (416) 555-0199): its last 10, 9 and,
// for a full number, 7 digits.
const phonePatterns = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7) return []
  // Each length from the whole number down to 8, and 7 for a full number.
  const lengths = [...Array(digits.length - 6).keys()].map((i) => digits.length - i).filter((n) => n > 7 || digits.length === 7 || digits.length >= 10)
  const tails = lengths.map((n) => digits.slice(-n))
  return tails.map((t) => new RegExp(`(?<!\\d)(?:\\+?\\d{1,3}[ \\t()./-]*)?(?:0[ \\t()./-]*)?\\(?${t.split('').join('[ \\t()./-]*')}(?!\\d)`, 'g'))
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
    .replace(DOMAIN, (d) => {
      const host = d.split('/')[0].toLowerCase()
      return ALLOWED.has(host) || (PATH_ONLY_ENDINGS.has(host.split('.').pop()!) && !d.includes('/')) ? d : '[link]'
    })
    .replace(HANDLE, '[link]')
  for (const re of known.phones.flatMap(phonePatterns)) text = text.replace(re, '[phone]')
  text = text.replace(PHONE_SHAPE, (m, at: number, all: string) => (isPhone(m, at, all) ? '[phone]' : m))
  for (const n of [...known.names].sort(byLength)) if (n.length >= 3 || caseless(n)) text = text.replace(new RegExp(namePattern(n), 'giu'), '[name]')
  for (const w of known.nameWords.flatMap(cases)) text = text.replace(new RegExp(namePattern(w), 'gu'), '[name]')
  for (const a of ADDRESSES) text = text.replace(a, '[address]')
  text = text.replace(JP_ADDRESS, '[address]').replace(POSTAL, (m) => (/^[A-Z]{2,3}[ \t]+\d/.test(m) ? `${m.split(/[ \t]/)[0]} [postal code]` : '[postal code]'))
  for (const p of [...known.places].sort(byLength).flatMap(cases)) if (p.length >= 3 || caseless(p)) text = text.replace(new RegExp(namePattern(p), 'gu'), '[location]')
  for (const w of [...known.placeWords].sort(byLength).flatMap(cases)) text = text.replace(new RegExp(namePattern(w), 'gu'), '[location]')
  // A province, state or country named right after the user's city goes with
  // it ("Toronto, Ontario"); alone it names no one ("Ontario Teachers" stays).
  text = text.replace(REGION_AFTER_PLACE, '[location]')
  // A postal code or region beside the user's location goes with it ("28013
  // Madrid", "Sydney NSW 2000", "New Delhi - 110085"); a year beside it stays
  // ("Toronto 2018 - 2020"), unless a region code comes first (Australia's 2000).
  return text.replace(LOCATION_NEIGHBOURS, '[location]')
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
