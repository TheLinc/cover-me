import type { TailoredResume } from '../src/lib/pdf/types'
const role = (title: string, company: string, dates: string, bullets: string[]) => ({ title, company, location: 'Halifax, NS', dates, bullets })
export function shortResume(): TailoredResume {
  return {
    name: 'Jordan Reyes', headline: 'Junior Backend Developer', phone: '(555) 014-2290', email: 'jordan.reyes@example.com', website: '', location: 'Halifax, NS',
    summary: 'Recent computer science graduate with two internships building APIs in Python and Go.',
    experience: [role('Software Developer Intern', 'Harbourline Freight', 'May 2025 – Aug 2025', ['Built a shipment tracking endpoint used by 3 internal teams.', 'Added integration tests that caught 12 regressions before release.'])],
    education: [{ institution: 'Dalhousie University', degree: 'BSc, Computer Science', location: 'Halifax, NS', dates: '2021 – 2025', bullets: ['GPA: 3.7/4.0'] }],
    skills: 'Python, Go, PostgreSQL, Docker, Git',
  }
}
export function longResume(): TailoredResume {
  return {
    name: 'Jordan Reyes', headline: 'Staff Backend Engineer, Payments and Logistics', phone: '(555) 014-2290', email: 'jordan.reyes@example.com', website: 'jordanreyes.dev',
    links: ['jordanreyes.dev', 'github.com/jreyes-example', 'linkedin.com/in/jordan-reyes-example'], location: 'Halifax, NS',
    summary: 'Backend engineer with twelve years building payment, pricing and logistics services in Go, Python and Java. Led the move of a freight monolith to event-driven services, cut checkout latency by 38%, and built teams of up to nine engineers.',
    experience: [
      role('Staff Backend Engineer', 'Harbourline Freight', 'Mar 2021 – Present', ['Designed a Kafka-based shipment event pipeline handling 4M events a day with exactly-once delivery across three regions.', 'Cut p99 checkout latency from 820 ms to 510 ms by moving pricing to a cached Go service backed by Redis.', 'Set the service ownership model for 14 services and wrote the incident review process the company still uses.', 'Mentored four engineers to senior and ran the on-call rotation for the payments team.', 'Led the PostgreSQL 11 to 15 upgrade with no downtime, using logical replication and a staged cutover.']),
      role('Senior Backend Engineer', 'Tidewater Payments', 'Jun 2017 – Feb 2021', ['Built the PostgreSQL ledger behind $40M a month in card payments, with double-entry checks on every write.', 'Wrote the reconciliation job that matched 99.97% of settlements without manual review.', 'Moved CI from Jenkins to GitHub Actions, cutting build time from 22 to 7 minutes.', 'Designed idempotent payment APIs that ended duplicate charges on client retries.']),
      role('Backend Developer', 'Gulfstream Logistics', 'Jan 2015 – May 2017', ['Built route-pricing services in Java for 2,000 daily shipments.', 'Replaced nightly batch exports with a change-data-capture feed, so partners saw updates within a minute.', 'Introduced structured logging and dashboards that halved the time to find production faults.']),
      role('Software Developer', 'Bluenose Software', 'Jul 2013 – Dec 2014', ['Maintained a Rails booking platform for 40 regional ferry and bus operators.', 'Wrote the first automated test suite for the billing module, reaching 80% coverage.']),
    ],
    projects: [{ name: 'queue-lens', tech: 'Go, SQLite, Bubble Tea', link: 'github.com/jreyes-example/queue-lens', bullets: ['A terminal dashboard for Kafka consumer lag, 600 stars and 20 contributors.'] }],
    education: [{ institution: 'Dalhousie University', degree: 'BSc, Computer Science', location: 'Halifax, NS', dates: '2009 – 2013', bullets: ['GPA: 3.8/4.0', 'Thesis: scheduling heuristics for container terminals'] }],
    skills: 'Languages: Go, Python, Java, SQL, TypeScript\nInfrastructure: Kafka, PostgreSQL, Redis, AWS (ECS, Lambda, RDS), Terraform, Docker, Kubernetes\nPractices: Distributed systems, payments, incident response, API design, mentoring',
    certifications: ['AWS Certified Solutions Architect – Associate', 'Certified Kubernetes Application Developer (CKAD)'],
    otherSections: [{ heading: 'Talks', lines: ['Exactly-once is a lie, mostly: Atlantic Dev Conf 2024', 'Ledgers you can trust: PyCon Canada 2019'] }],
  }
}
