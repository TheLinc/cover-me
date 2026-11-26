import { readPosting } from './ats-checker/keywords'

const LEADERSHIP = /\b(manager|director|head|vp|vice president|chief|gm)\b/i

const ROLE_TITLES = [
  { slug: 'administrative-assistant', match: /\b(administrative|admin|office|executive|personal) (assistant|coordinator)\b|\breceptionist\b|\boffice manager\b/i },
  {
    slug: 'warehouse',
    match: /\b(warehouse|forklift|material handler|picker|packer)\b|\b(inventory|receiving|shipping|fulfil+ment) (associate|specialist|clerk)\b/i,
    exclude: new RegExp(`${LEADERSHIP.source}|\\b(engineer\\w*|architect|data|sales)\\b`, 'i'),
  },
  {
    slug: 'sales',
    match: /\b(sales|account executive|business development)\b/i,
    exclude: /\b(engineer\w*|operations|enablement|recruit\w*|analyst|retail|finance|marketing|data|compensation|warehouse)\b/i,
  },
  { slug: 'marketing', match: /\bmarketing\b/i, exclude: /\b(engineer\w*|scientist|recruit\w*)\b/i },
  {
    slug: 'engineering',
    match: /\bengineer\b/i,
    exclude: new RegExp(`${LEADERSHIP.source}|\\b(sales|presales|solutions|support|customer|recruit\\w*)\\b`, 'i'),
  },
] as const

export type RoleSlug = (typeof ROLE_TITLES)[number]['slug']
export const ROLE_SLUGS: RoleSlug[] = ROLE_TITLES.map((r) => r.slug)

export function roleOf(title: string): RoleSlug | undefined {
  return ROLE_TITLES.find((r) => r.match.test(title) && !('exclude' in r && r.exclude.test(title)))?.slug
}

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
  mdash: '—', ndash: '–', hellip: '…', bull: '•', middot: '·',
}
const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) =>
    name[0] === '#' ? String.fromCodePoint(Number(name[1].toLowerCase() === 'x' ? `0${name.slice(1)}` : name.slice(1))) : ENTITIES[name.toLowerCase()] ?? whole)

function htmlToText(html: string): string {
  const text = html
    .replace(/\s+/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^<>]*>/gi, '\n- ')
    .replace(/<\/(p|div|ul|ol|h[1-6]|tr|section)>/gi, '\n')
    .replace(/<[^<>]*>/g, '')
  return decode(text)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

export const greenhouseText = (content: string) => htmlToText(decode(content))

export interface LeverPosting {
  description: string
  lists: { text: string; content: string }[]
  additional: string
}

export const leverText = (p: LeverPosting) =>
  htmlToText([p.description, ...p.lists.flatMap((l) => [`<div>${l.text}</div>`, `<ul>${l.content}</ul>`]), p.additional].join(''))

export const PER_COMPANY = 10
export const MIN_POSTINGS = 30
const MIN_COMPANIES = 3
const TOP = 30

export type Source = 'Greenhouse' | 'Lever'
export interface RolePosting {
  company: string
  source: Source
  text: string
}

export function countKeywords(all: RolePosting[]) {
  const seen = new Set<string>()
  const taken = new Map<string, number>()
  const postings = all.filter((p) => {
    if (seen.has(p.text) || (taken.get(p.company) ?? 0) >= PER_COMPANY) return false
    seen.add(p.text)
    taken.set(p.company, (taken.get(p.company) ?? 0) + 1)
    return true
  })
  const sources: Record<Source, number> = { Greenhouse: 0, Lever: 0 }
  const tally = new Map<string, { postings: number; companies: Set<string> }>()
  for (const p of postings) {
    sources[p.source]++
    for (const k of readPosting(p.text).keywords) {
      if (k.level === 'mentioned') continue
      const t = tally.get(k.name) ?? { postings: 0, companies: new Set<string>() }
      t.postings++
      t.companies.add(p.company)
      tally.set(k.name, t)
    }
  }
  return {
    postings: postings.length,
    companies: taken.size,
    sources,
    keywords: [...tally]
      .filter(([, t]) => t.companies.size >= MIN_COMPANIES)
      .sort(([a, x], [b, y]) => y.postings - x.postings || a.localeCompare(b))
      .slice(0, TOP)
      .map(([name, { postings }]) => ({ name, postings })),
  }
}
