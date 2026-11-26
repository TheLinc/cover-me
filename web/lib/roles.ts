import data from './role-keywords.json'
import { ROLE_SLUGS, kindOf, type RoleSlug } from './role-keywords'
import { month } from './utils'

interface RoleCopy {
  slug: RoleSlug
  name: string
  metaDescription: string
  titles: string
  intro: string[]
  bullets: string[]
}

// Administrative assistant and warehouse are counted but not published: their postings come from too few
// employers outside tech (#402).
const COPY: RoleCopy[] = [
  {
    slug: 'sales',
    name: 'Sales',
    metaDescription:
      'The skills, tools and degrees sales job postings ask for most, counted across real public postings, with the share of postings that ask for each one.',
    titles: 'account executive, sales development, business development and other sales titles, leaving out sales engineers',
    intro: [
      'Sales postings name the tools a team already runs, so a resume that says "CRM" can miss a posting that asks for Salesforce. Use the names the posting uses, and put each one next to a result, such as a quota you hit or a pipeline you built.',
    ],
    bullets: [
      'Closed $1.2M in new B2B SaaS revenue in 2025, 118% of quota, from outbound prospecting and cold calling.',
      'Kept a 3x pipeline in Salesforce and called each quarter within 5% of the final number.',
      'Ran the negotiation on 14 enterprise renewals with buyers\' procurement teams, holding the average discount under 10%.',
      'Built a lead generation sequence on LinkedIn that booked 40 first meetings a quarter for two account executives.',
    ],
  },
  {
    slug: 'marketing',
    name: 'Marketing',
    metaDescription:
      'The skills, tools and degrees marketing job postings ask for most, counted across real public postings, with the share of postings that ask for each one.',
    titles: 'product marketing, growth, lifecycle, demand generation and other marketing titles',
    intro: [
      'Marketing postings ask for the software a team runs its campaigns in, such as Marketo or Salesforce. Name the tools you used on your resume, and give the number each campaign moved.',
    ],
    bullets: [
      'Rebuilt the trial emails as a lifecycle marketing program in Marketo, lifting trial-to-paid conversion from 4% to 6.5%.',
      'Ran an ABM program for 200 B2B target accounts that sourced $3M in pipeline in two quarters.',
      'Wrote the SQL and built the Tableau dashboard the team used to report campaign return each week.',
      'Led the GTM plan for a SaaS product launch across product, sales and support, shipped on the planned date.',
    ],
  },
  {
    slug: 'engineering',
    name: 'Engineering',
    metaDescription:
      'The skills, tools and degrees engineering job postings ask for most, counted across real public postings, with the share of postings that ask for each one.',
    titles: 'software, hardware, mechanical, electrical and other engineer titles, leaving out managers and sales, solutions and support engineers',
    intro: [
      'The postings come from software, hardware and aerospace companies. Most of the list is programming languages and cloud platforms, and "electrical" comes mostly from degree fields such as electrical engineering. When a posting names a specific service or version, such as AWS Lambda, use that name on your resume and not only the platform.',
    ],
    bullets: [
      'Built a Python API on AWS that serves 40 million requests a day with p99 latency under 120 ms.',
      'Moved 30 services to Kubernetes with Terraform, cutting deploy time from 40 minutes to 8.',
      'Added an LLM step to the support pipeline that resolves 35% of tickets without a person.',
      'Set up CI/CD for a TypeScript and React app, taking releases from weekly to daily.',
    ],
  },
]

export const FETCHED = data.fetched

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase())

export const ROLES = COPY.map((c) => {
  const counts = data.roles[c.slug]
  return { ...c, noun: c.name.toLowerCase(), counts, metaTitle: `${titleCase(c.name)} Resume Keywords From ${counts.postings} Job Postings` }
})
export type Role = (typeof ROLES)[number]

export const HELD = ROLE_SLUGS.filter((s) => !ROLES.some((r) => r.slug === s))

export const getRole = (slug: string) => ROLES.find((r) => r.slug === slug)

type Counted = Role['counts']['keywords'][number]

export const percent = (r: Role, k: Counted) => Math.round((k.postings / r.counts.postings) * 100)
const share = (r: Role, k: Counted) => `${k.name} (${percent(r, k)}%)`
const an = (word: string) => `${/^(MBA|[aeiou])/i.test(word) ? 'an' : 'a'} ${word}`
const tools = (r: Role) => r.counts.keywords.filter((k) => kindOf(k.name) === 'Tools and software')

export function lead(r: Role): string {
  const [a, b, c] = r.counts.keywords
  const [tool] = tools(r)
  const first = `The ${r.counts.postings} ${r.noun} job postings read in ${month(FETCHED)} ask most for ${share(r, a)}, ${share(r, b)} and ${share(r, c)}.`
  return tool && ![a, b, c].includes(tool) ? `${first} The tool they name most is ${tool.name}, in ${percent(r, tool)}% of them (${tool.postings} of ${r.counts.postings}).` : first
}

export function answers(r: Role): { q: string; a: string }[] {
  const n = r.counts.postings
  const [k1, k2, k3, k4] = r.counts.keywords
  const [t1, t2, t3] = tools(r)
  const degrees = r.counts.keywords.filter((k) => kindOf(k.name) === 'Education and certifications')
  const bachelor = degrees.find((k) => k.name === "Bachelor's degree")
  const higher = degrees.find((k) => k !== bachelor && /degree|MBA|PhD/.test(k.name))
  const qa = [
    {
      q: `What keywords should ${an(r.noun)} resume have?`,
      a: `Start with the ones ${r.noun} postings ask for most. Of the ${n} postings read in ${month(FETCHED)}, ${k1.postings} ask for ${k1.name} (${percent(r, k1)}%), then ${share(r, k2)}, ${share(r, k3)} and ${share(r, k4)}. Add the tools from the table that you have used, by name, and leave out any keyword your experience can't back up.`,
    },
  ]
  if (t2) {
    qa.push({
      q: `Which tools do ${r.noun} job postings ask for?`,
      a: `${t1.name} leads, named in ${t1.postings} of ${n} postings (${percent(r, t1)}%), followed by ${share(r, t2)}${t3 ? ` and ${share(r, t3)}` : ''}. Recruiters search an applicant tracking system for tools by name, so write the product you used, such as ${t1.name}, rather than a general word like "software" or "CRM".`,
    })
  }
  if (bachelor) {
    const more = higher ? `, and ${higher.postings} ask for ${an(higher.name.replace(/^Master's/, "master's"))}` : ''
    qa.push({
      q: `Do ${r.noun} jobs ask for a degree?`,
      a: `${bachelor.postings} of ${n} postings (${percent(r, bachelor)}%) ask for a bachelor's degree as a requirement or a nice-to-have${more}. The real share is higher, since this count misses wordings like "4-year degree". List your degree once, in an education section near the end.`,
    })
  }
  return qa
}
