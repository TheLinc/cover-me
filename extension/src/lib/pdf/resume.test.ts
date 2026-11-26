import { describe, expect, test } from 'vitest'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { tailoredResumePdf } from './resume'
import type { ResumeTemplate, TailoredResume } from './types'

const filler = (n: number, word: string) => Array.from({ length: n }, (_, i) => (i % 7 === 0 ? `${word}ification` : word)).join(' ')

const LONG: TailoredResume = {
  name: 'Alexandra Montgomery-Okonkwo',
  headline: 'Principal Software Engineer, Distributed Systems and Developer Platforms',
  phone: '+1 (555) 010-2233',
  email: 'alexandra.montgomery@example.com',
  website: 'alexandra.dev',
  links: ['alexandra.dev', 'linkedin.com/in/alexandra-montgomery-okonkwo', 'github.com/amontgomery'],
  location: 'Toronto, ON',
  summary: `Engineer with fourteen years building payments, search and developer tooling. ${filler(60, 'scale')}`,
  experience: Array.from({ length: 7 }, (_, j) => ({
    title: j === 2 ? 'Senior Staff Software Engineer, Payments Infrastructure and Reliability Engineering' : `Senior Engineer ${j + 1}`,
    company: `Northwind Holdings ${j + 1}`,
    location: 'Toronto, ON (Hybrid)',
    dates: `Jan 20${10 + j} – Dec 20${11 + j}`,
    bullets: Array.from({ length: 6 }, (_, k) => `Led migration ${k + 1} of the ledger service to an event-sourced design, ${filler(18 + k * 4, 'throughput')}, cutting p99 latency 42% across 12 regions.`),
  })),
  projects: [
    { name: 'tidewatch', tech: 'Go, SQLite, WebAssembly, Kubernetes operators, Prometheus, Grafana', link: 'github.com/amontgomery/tidewatch-observability-toolkit-for-coastal-sensors', bullets: ['Open-source tide sensor dashboard with 2.1k stars.', filler(30, 'sensor')] },
    { name: 'ledgerlite', link: 'ledgerlite.dev', bullets: ['Double-entry bookkeeping library.'] },
  ],
  education: [
    { institution: 'University of Waterloo', degree: 'BASc, Computer Engineering', location: 'Waterloo, ON', dates: '2006 – 2011', bullets: ['GPA: 3.9/4.0', 'Dean’s list, five terms', filler(20, 'thesis')] },
  ],
  skills: 'Languages: Go, Rust, TypeScript, Python, SQL, Java, Kotlin, Bash\nInfrastructure: Kubernetes, Terraform, AWS (ECS, Lambda, DynamoDB, Aurora), GCP, Kafka, Redis, PostgreSQL, ClickHouse, Envoy, Istio\nPractices: Distributed systems design, incident command, SLOs, capacity planning, technical mentorship, architecture review',
  certifications: ['AWS Certified Solutions Architect – Professional', 'Certified Kubernetes Administrator (CKA)'],
  otherSections: [
    { heading: 'Awards', lines: [], entries: [{ name: 'Hackathon winner', subtitle: '1st Place | Hosted by AWS', dates: '2019', link: 'devpost.com/software/very-long-project-name-goes-here', bullets: ['Built a fraud model in 36 hours.'] }] },
    { heading: 'Volunteer', lines: ['Mentor, Canada Learning Code (2015 – present)', 'Organizer, Toronto Go meetup'] },
  ],
}

const SHORT: TailoredResume = {
  name: 'Sam Lee',
  phone: '555-0100',
  email: 'sam@example.com',
  website: '',
  summary: 'Recent graduate looking for a junior developer role.',
  experience: [{ title: 'Intern', company: 'Acme', location: 'Remote', dates: 'Summer 2025', bullets: ['Fixed 40 bugs.', 'Wrote tests.'] }],
  education: [{ institution: 'State College', degree: 'BS, Computer Science', location: 'Ohio', dates: '2025', bullets: [] }],
  skills: 'JavaScript, React, SQL',
}

interface Line { page: number; text: string; x: number; y: number; width: number; size: number; family: string }

async function read(resume: TailoredResume): Promise<{ pages: number; lines: Line[] }> {
  const pdf = await getDocument({ data: new Uint8Array(tailoredResumePdf(resume).output('arraybuffer')), verbosity: 0 }).promise
  const lines: Line[] = []
  for (let page = 1; page <= pdf.numPages; page++) {
    const { items, styles } = await (await pdf.getPage(page)).getTextContent()
    for (const item of items) {
      if (!('str' in item) || !item.str.trim()) continue
      const [size, , , , x, y] = item.transform as number[]
      lines.push({ page, text: item.str, x, y, width: item.width, size, family: styles[item.fontName].fontFamily })
    }
  }
  return { pages: pdf.numPages, lines }
}

const withTemplate = (r: TailoredResume, template: ResumeTemplate) => ({ ...r, template })

describe('resume templates', () => {
  test('a resume with no template, or one this build does not know, prints in Classic serif', async () => {
    for (const template of [undefined, 'retro', 'toString']) {
      const r = { ...SHORT, template: template as ResumeTemplate }
      const { lines } = await read(r)
      expect(new Set(lines.map((l) => l.family))).toEqual(new Set(['serif']))
    }
  })

  test('Modern prints in a sans-serif font', async () => {
    const { lines } = await read(withTemplate(SHORT, 'modern'))
    expect(new Set(lines.map((l) => l.family))).toEqual(new Set(['sans-serif']))
  })
})
