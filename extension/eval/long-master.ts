// A long master resume (three roles of 14 bullets, a headline, grouped
// skills, an Open Source section of entries) tailored with "Remove irrelevant
// bullets" on: the trim budget, measured results and the new parse fields
// all run against a real model. Made up; no real person or employer.

import type { ParsedResume } from '../src/types'
import type { EvalCase } from './fixtures'

const roles = [
  {
    title: 'Senior Software Engineer', company: 'Northwind Logistics', location: 'Chicago, IL', dates: 'Jan 2023 – Present',
    bullets: [
      'Cut p95 latency of the shipment-tracking API from 820 ms to 310 ms by adding a Redis read-through cache',
      'Designed an event pipeline on Kafka that moves 40 million carrier updates a day into Postgres',
      'Raised on-time alert accuracy from 0.81 to 0.93 by rewriting the ETA model features with the data team',
      'Led a team of 4 engineers migrating three Python 2 services to Python 3.11 and FastAPI',
      'Wrote the incident runbooks for the tracking platform and ran its on-call rotation',
      'Built a Terraform module that provisions a service, its queue and dashboards in one apply',
      'Reviewed 10-15 pull requests a week across the tracking and billing repositories',
      'Mentored two junior engineers through their first production launches',
      'Added contract tests between the tracking API and 6 downstream consumers with Pact',
      'Replaced a nightly batch reconciliation job with streaming checks, removing a 6-hour data delay',
      'Introduced OpenTelemetry tracing across 9 services and wired it to Grafana Tempo',
      'Wrote the design doc for multi-region failover adopted by the platform group',
      'Partnered with customer support to triage the top 20 tracking complaints each month',
      'Presented the quarterly reliability review to engineering leadership',
    ],
  },
  {
    title: 'Software Engineer', company: 'Brightline Health', location: 'Remote', dates: 'Jun 2020 – Dec 2022',
    bullets: [
      'Reduced claims-file processing time from 45 to 12 minutes by parallelising the parser with asyncio',
      'Built REST APIs in Django for the eligibility service used by 30 clinic partners',
      'Moved CI from Jenkins to GitHub Actions, cutting median build time 18 to 7 minutes',
      'Implemented HIPAA audit logging for every read of a patient record',
      'Wrote the schema migrations for splitting the monolith database into three services',
      'Built an internal admin tool in React for the operations team',
      'Added property-based tests with Hypothesis to the claims parser',
      'Owned the integration with two clearinghouses over SFTP and X12 EDI',
      'Ran load tests with Locust ahead of open enrollment',
      'Documented the eligibility API in OpenAPI and published client SDKs',
      'Fixed a timezone bug that misdated 2% of claims',
      'Onboarded 5 new engineers to the claims codebase',
      'Joined the architecture guild and reviewed service designs',
      'Organised the team’s weekly tech talks',
    ],
  },
  {
    title: 'Junior Developer', company: 'Lakeview Web Studio', location: 'Milwaukee, WI', dates: 'Jul 2018 – May 2020',
    bullets: [
      'Built 25 client websites in WordPress and PHP',
      'Improved Lighthouse performance scores from 54 to 91 on the studio’s top client sites',
      'Wrote a Node.js script that automated image compression for every deploy',
      'Set up staging environments on DigitalOcean for client review',
      'Handled support tickets for 40 hosted sites',
      'Learned and introduced Git branching for the studio’s 3 developers',
      'Built custom WooCommerce checkout fields for two retail clients',
      'Wrote accessibility fixes after WCAG audits',
      'Migrated client sites from shared hosting to managed hosting',
      'Created the studio’s first component library in Sass',
      'Wrote client handover guides',
      'Tracked time and estimates in Harvest',
      'Attended client kickoff calls',
      'Maintained the studio’s internal wiki',
    ],
  },
]

const projects = [
  { name: 'tidewatch', link: 'github.com/jmorales/tidewatch', tech: 'Go, SQLite, HTMX', bullets: ['A self-hosted uptime monitor checking 200 endpoints a minute on a Raspberry Pi', 'Sends alerts to Slack and email with per-check backoff'] },
]

const openSource = [
  { name: 'pg-outbox', subtitle: 'Creator and Maintainer', link: 'github.com/jmorales/pg-outbox', bullets: ['Transactional outbox library for Postgres and Kafka, 1,200 GitHub stars', 'Used in production by three companies that wrote in'] },
]

const skillsText = 'Languages: Python, Go, TypeScript, SQL\nBackend: FastAPI, Django, Kafka, Redis, Postgres\nInfrastructure: AWS, Terraform, Docker, GitHub Actions, OpenTelemetry, Grafana'

const longText = `Jordan Morales
Backend Engineer
jordan.morales@example.com | (555) 330-1928 | Chicago, IL | github.com/jmorales

EXPERIENCE

${roles.map((r) => `${r.title} — ${r.company}, ${r.location} (${r.dates})\n${r.bullets.map((b) => `- ${b}`).join('\n')}`).join('\n\n')}

PROJECTS

${projects.map((p) => `${p.name} | ${p.tech} | ${p.link}\n${p.bullets.map((b) => `- ${b}`).join('\n')}`).join('\n\n')}

OPEN SOURCE

${openSource.map((o) => `${o.name} | ${o.subtitle} | ${o.link}\n${o.bullets.map((b) => `- ${b}`).join('\n')}`).join('\n\n')}

EDUCATION

B.S. Computer Science — University of Illinois Chicago, Chicago, IL (2014 – 2018)

SKILLS
${skillsText}`

const longParsed: ParsedResume = {
  name: 'Jordan Morales',
  email: 'jordan.morales@example.com',
  phone: '(555) 330-1928',
  website: 'github.com/jmorales',
  links: ['github.com/jmorales'],
  location: 'Chicago, IL',
  headline: 'Backend Engineer',
  experience: roles.map((r) => ({ ...r, bullets: [...r.bullets] })),
  projects: projects.map((p) => ({ ...p, bullets: [...p.bullets] })),
  education: [{ institution: 'University of Illinois Chicago', degree: 'B.S. Computer Science', location: 'Chicago, IL', dates: '2014 – 2018', bullets: [] }],
  skills: skillsText,
  otherSections: [{ heading: 'OPEN SOURCE', lines: [], entries: openSource.map((o) => ({ ...o, bullets: [...o.bullets] })) }],
  sectionOrder: ['summary', 'experience', 'projects', 'other', 'education', 'skills'],
}

export const LONG_MASTER_CASE: EvalCase = {
  id: 'tech-long-master-trim',
  industry: 'Technology',
  fieldNotes: 'Software engineering: a long master resume cut to the bullets this backend role needs. Measured results stay; the headline stays the candidate\'s unless they held the role.',
  trim: true,
  job: {
    title: 'Site Reliability Engineer',
    company: 'Corvid Payments',
    url: 'https://example.com/jobs/long-master',
    description: `Corvid Payments is hiring a Site Reliability Engineer to keep our payments APIs fast and available.

What you'll do:
- Own latency and availability SLOs for our Go and Python services
- Build and run our observability stack (OpenTelemetry, Grafana, Prometheus)
- Automate infrastructure with Terraform on AWS
- Lead incident response and write runbooks and postmortems
- Improve CI/CD pipelines and deployment safety

Requirements:
- 4+ years running production backend services
- Experience with Kafka or another event streaming system
- Strong Python or Go
- Experience with Kubernetes in production`,
  },
  resumeText: longText,
  parsed: longParsed,
  failTerms: ['Kubernetes', 'Prometheus'],
  warnTerms: ['payments'],
  mustKeepSkills: ['Python', 'Go', 'Kafka', 'Terraform', 'OpenTelemetry', 'Grafana', 'AWS'],
}
