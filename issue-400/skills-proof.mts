// Runs the BYOK tailor path (buildPrompt -> Sonnet -> assembleTailored) of one
// checkout on a made-up 31-skill resume, default mode, and prints the skills.
// Usage: tsx skills-proof.ts <extension dir> <before|after>
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'

const [dir, side] = process.argv.slice(2)
const load = (p: string) => import(pathToFileURL(join(dir, p)).href)
const { buildPrompt, assembleTailored } = await load('src/lib/ai/resume-tailor.ts')
const { call } = await load('eval/model.ts')

const skills = 'Go, Python, TypeScript, JavaScript, React, Node.js, GraphQL, Java, Kotlin, PHP, PostgreSQL, MySQL, Redis, Kafka, RabbitMQ, Docker, Kubernetes, Terraform, AWS, GCP, Jenkins, GitHub Actions, Jira, Grafana, Prometheus, gRPC, REST APIs, Linux, Bash, Git, Agile'
const own = skills.split(', ')
const parsed = {
  name: 'Jordan Vale', email: 'jordan.vale@example.com', phone: '(555) 010-4477', website: '', location: 'Denver, CO',
  experience: [
    { title: 'Backend Engineer', company: 'Halcyon Freight', location: 'Denver, CO', dates: 'Mar 2022 – Present', bullets: [
      'Built a Go order-routing service on Kafka and PostgreSQL handling 4,000 events per second',
      'Moved 12 services from Jenkins to GitHub Actions, cutting deploy time from 25 to 9 minutes',
      'Ran the Kubernetes and Terraform setup for three AWS regions',
      'Added Prometheus and Grafana alerts that caught 30 incidents before customers reported them',
    ] },
    { title: 'Software Developer', company: 'Brightform Studio', location: 'Denver, CO', dates: 'Jun 2019 – Feb 2022', bullets: [
      'Wrote React and TypeScript dashboards backed by a Node.js GraphQL API',
      'Maintained PHP and MySQL billing scripts for 200 client accounts',
      'Built Python data exports on GCP for the analytics team',
    ] },
  ],
  education: [{ institution: 'Colorado State University', degree: 'B.S. Computer Science', location: 'Fort Collins, CO', dates: '2015 – 2019', bullets: [] }],
  skills,
}
const job = {
  title: 'Senior Backend Engineer (Go)', company: 'Northline Logistics', url: 'https://example.com/jobs/1',
  description: 'Northline Logistics is hiring a Senior Backend Engineer to build our shipment platform in Go. You will design event-driven services on Kafka, own PostgreSQL schemas, and run them on Kubernetes in AWS. Requirements: 5+ years of backend experience, strong Go, Kafka, PostgreSQL, Kubernetes, AWS, Terraform and CI/CD. Nice to have: gRPC, Redis, Prometheus.',
}

const model = 'claude-sonnet-5-5'
const raw = await call([{ role: 'user', content: buildPrompt(job, parsed, false, undefined, false) }], { model, maxTokens: 6000, label: 'tailor' })
const ask = (p: string) => call([{ role: 'user', content: p }], { model, maxTokens: 2000, label: 'check' })
const out = await assembleTailored(parsed, raw, { jobDescription: job.description, jobTitle: job.title, ask, exactBulletCounts: true })
const outSkills: string = out.skills ?? ''
const key = (s: string) => s.toLowerCase().replace(/\([^()]*\)/g, '').trim()
const outKeys = outSkills.split(',').map(key)
const missing = own.filter((s) => !outKeys.includes(key(s)) && !outSkills.toLowerCase().includes(`(${s.toLowerCase()})`))
console.log(`[${side}] mode: default (trim off, compact off)`)
console.log(`[${side}] skills in: ${own.length}, out: ${outSkills.split(',').length}`)
console.log(`[${side}] output: ${outSkills}`)
console.log(`[${side}] resume skills missing from output (${missing.length}): ${missing.join(', ') || 'none'}`)
if (side === 'after' && missing.length) throw new Error('after: a resume skill is missing')
if (side === 'before' && !missing.length) throw new Error('before: expected the bug (skills cut) to show')
