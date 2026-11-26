import data from './role-keywords.json'
import type { RoleSlug } from './role-keywords'

interface RoleCopy {
  slug: RoleSlug
  name: string
  noun: string
  metaTitle: string
  metaDescription: string
  titles: string
  intro: string[]
}

const COPY: RoleCopy[] = [
  {
    slug: 'sales',
    name: 'Sales',
    noun: 'sales',
    metaTitle: 'Sales Resume Keywords Employers Ask For',
    metaDescription:
      'The skills, tools and certifications sales job postings ask for most, counted across real public postings, with how many postings ask for each one.',
    titles: 'account executive, sales development, business development and other sales titles, leaving out sales engineers',
    intro: [
      'Sales postings name the tools a team already runs, so a resume that says "CRM" can miss a posting that asks for Salesforce. Use the names the posting uses, and put each one next to a result, such as a quota you hit or a pipeline you built.',
    ],
  },
  {
    slug: 'marketing',
    name: 'Marketing',
    noun: 'marketing',
    metaTitle: 'Marketing Resume Keywords Employers Ask For',
    metaDescription:
      'The skills, tools and certifications marketing job postings ask for most, counted across real public postings, with how many postings ask for each one.',
    titles: 'product marketing, growth, lifecycle, demand generation and other marketing titles',
    intro: [
      'Marketing postings mix channels, such as email or paid search, with the software that runs them. Name both on your resume, and give the number each campaign moved.',
    ],
  },
  {
    slug: 'engineering',
    name: 'Engineering',
    noun: 'engineering',
    metaTitle: 'Engineering Resume Keywords Employers Ask For',
    metaDescription:
      'The skills, tools and degrees engineering job postings ask for most, counted across real public postings, with how many postings ask for each one.',
    titles: 'software, hardware, mechanical, electrical and other engineer titles, leaving out managers and sales engineers',
    intro: [
      'The postings come from software, hardware and aerospace companies, so the list mixes programming languages and cloud platforms with electrical and mechanical skills. When a posting names a specific service or version, such as AWS Lambda, use that name on your resume and not only the platform.',
    ],
  },
  {
    slug: 'warehouse',
    name: 'Warehouse',
    noun: 'warehouse',
    metaTitle: 'Warehouse Resume Keywords Employers Ask For',
    metaDescription:
      'The skills, certifications and tools warehouse job postings ask for most, counted across real public postings, with how many postings ask for each one.',
    titles: 'warehouse associate, forklift operator, material handler, inventory, receiving and fulfillment titles, leaving out managers',
    intro: [
      'Warehouse postings are short, and what they ask for is concrete: running a forklift, counting inventory, and using the warehouse system the site runs. Put a forklift certification near the top of your resume, where a recruiter skimming it will see it.',
    ],
  },
  {
    slug: 'administrative-assistant',
    name: 'Administrative assistant',
    noun: 'administrative and executive assistant',
    metaTitle: 'Administrative Assistant Resume Keywords',
    metaDescription:
      'The skills and tools administrative and executive assistant job postings ask for most, counted across real public postings, with how many ask for each.',
    titles: 'executive assistant, administrative assistant, office manager and receptionist titles',
    intro: [
      'Few administrative assistant jobs are posted on Greenhouse and Lever, so this page counts executive assistant, office manager and receptionist postings with them. Most of the postings read are for executive assistants.',
      "These postings ask for soft skills by name, such as attention to detail and organization, more often than sales or engineering postings do. A resume line that shows the skill, such as managing three executives' calendars, does more than listing the words.",
    ],
  },
]

export const FETCHED = data.fetched

export const ROLES = COPY.map((c) => ({ ...c, fetched: data.fetched, counts: data.roles[c.slug] }))
export type Role = (typeof ROLES)[number]

export const getRole = (slug: string) => ROLES.find((r) => r.slug === slug)
