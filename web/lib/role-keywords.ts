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
    exclude: /\b(engineer\w*|operations?|enablement|recruit\w*|analyst|retail|finance|marketing|data|compensation|warehouse|pre-?sales|architect|people)\b/i,
  },
  { slug: 'marketing', match: /\bmarketing\b/i, exclude: /\b(engineer\w*|scientist|recruit\w*|finance|product manager)\b/i },
  {
    slug: 'engineering',
    match: /\bengineer\b/i,
    exclude: new RegExp(`${LEADERSHIP.source}|\\b(sales|presales|solutions?|support|customer|recruit\\w*)\\b`, 'i'),
  },
] as const

export type RoleSlug = (typeof ROLE_TITLES)[number]['slug']
export const ROLE_SLUGS: RoleSlug[] = ROLE_TITLES.map((r) => r.slug)

export function roleOf(title: string): RoleSlug | undefined {
  return ROLE_TITLES.find((r) => r.match.test(title) && !('exclude' in r && r.exclude.test(title)))?.slug
}

// A role's own name and the teams it works with ("work closely with Marketing, Product and Customer Success") read as
// asks, and every sales "compliance" ask read was a culture line ("a 'compliance first' attitude") or the buyer's team (#299).
const SKIP: Record<RoleSlug, string[]> = {
  'administrative-assistant': [],
  warehouse: ['warehouse'],
  sales: ['sales', 'SDR', 'BDR', 'compliance', 'marketing', 'customer success'],
  marketing: ['marketing', 'PMM', 'sales'],
  engineering: [],
}
export const skipFor = (slug: RoleSlug) => SKIP[slug]

export const KINDS = ['Tools and software', 'Skills', 'Education and certifications', 'Soft skills'] as const
export type Kind = (typeof KINDS)[number]

const TOOLS = new Set([
  'Salesforce', 'HubSpot', 'LinkedIn', 'Sales Navigator', 'ZoomInfo', 'Outreach.io', 'Gong', 'Salesloft', 'Clari', 'Zendesk',
  'Iterable', 'Mixpanel', '6sense', 'Demandbase', 'Google Ads', 'Canva', 'Marketo', 'Tableau', 'Looker', 'Power BI', 'Google Analytics', 'Excel', 'Microsoft Office', 'Word',
  'PowerPoint', 'Outlook', 'Google Workspace', 'Slack', 'Jira', 'Figma', 'QuickBooks', 'SQL', 'Python', 'Java',
  'JavaScript', 'TypeScript', 'Go', 'Rust', 'C++', 'C#', 'React', 'Node.js', 'AWS', 'GCP', 'Azure', 'Kubernetes', 'Docker', 'Terraform',
  'Linux', 'Git', 'Snowflake', 'dbt', 'Airflow', 'Spark', 'PyTorch', 'TensorFlow',
])
const EDUCATION = new Set(["Bachelor's degree", "Master's degree", 'MBA', 'PhD', 'High school diploma', "driver's license", 'CPA', 'PMP'])
const SOFT = new Set([
  'communication', 'leadership', 'organizational skills', 'interpersonal skills', 'attention to detail', 'teamwork', 'problem-solving',
  'mentoring', 'time management', 'multitasking', 'stakeholder management',
])

const SKILLS = new Set([
  'AI', 'SaaS', 'B2B', 'sales', 'marketing', 'business development', 'negotiation', 'CRM', 'ERP', 'WMS', 'customer success', 'procurement',
  'forecasting', 'account management', 'networking', 'cold calling', 'onboarding', 'KPI', 'lead generation', 'logistics', 'PEO',
  'program management', 'project management', 'ROI', 'marketing automation', 'growth marketing', 'GTM', 'compliance', 'ABM',
  'lifecycle marketing', 'business intelligence', 'machine learning', 'API', 'LLM', 'distributed systems', 'CI/CD', 'electrical',
  'SEO', 'content marketing', 'email marketing', 'social media', 'data analysis', 'statistics', 'inventory', 'forklift', 'supply chain', 'scheduling',
])

export const isSorted = (name: string) => [TOOLS, EDUCATION, SOFT, SKILLS].some((set) => set.has(name))

export const kindOf = (name: string): Kind =>
  TOOLS.has(name) ? 'Tools and software' : EDUCATION.has(name) ? 'Education and certifications' : SOFT.has(name) ? 'Soft skills' : 'Skills'

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
  mdash: '—', ndash: '–', hellip: '…', bull: '•', middot: '·',
}
const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (name[0] !== '#') return ENTITIES[name.toLowerCase()] ?? whole
    const code = Number(name[1].toLowerCase() === 'x' ? `0${name.slice(1)}` : name.slice(1))
    return code <= 0x10ffff ? String.fromCodePoint(code) : whole
  })

function htmlToText(html: string): string {
  const text = html
    .replace(/\s+/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li\b[^<>]*>(\s*<(p|div|span)\b[^<>]*>)*/gi, '\n- ')
    .replace(/<h[1-6]\b[^<>]*>/gi, '\n## ')
    .replace(/<\/?(p|div|ul|ol|h[1-6]|tr|section)\b[^<>]*>/gi, '\n')
    .replace(/<[^<>]*>/g, '')
  return decode(text)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line && line !== '##')
    .join('\n')
}

export const greenhouseText = (content: string) => htmlToText(decode(content))

export interface LeverPosting {
  description: string
  lists?: { text: string; content: string }[]
  additional: string
}

export const leverText = (p: LeverPosting) =>
  htmlToText([p.description, ...(p.lists ?? []).flatMap((l) => [`<div>${l.text}</div>`, `<ul>${l.content}</ul>`]), p.additional].join(''))

export const PER_COMPANY = 10
export const MIN_POSTINGS = 30
export const MIN_COMPANIES = 3
export const TOP = 30

export type Source = 'Greenhouse' | 'Lever'
export interface RolePosting {
  company: string
  source: Source
  text: string
}

export function countKeywords(all: RolePosting[], skip: string[] = []) {
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
      if (k.level === 'mentioned' || skip.includes(k.name)) continue
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
