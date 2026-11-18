// Two made-up resumes as PDFs and a job page with JobPosting JSON-LD.
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'
const require = createRequire('F:/worktrees/cover-me/t3-b23cad76/extension/package.json')
const { jsPDF } = require('jspdf')

function pdf(file, lines) {
  const doc = new jsPDF()
  let y = 15
  for (const l of lines) {
    doc.setFont('helvetica', l.startsWith('#') ? 'bold' : 'normal')
    doc.setFontSize(l.startsWith('# ') ? 16 : 11)
    doc.text(l.replace(/^#+ /, ''), 15, y)
    y += l.startsWith('#') ? 8 : 6
  }
  writeFileSync(file, Buffer.from(doc.output('arraybuffer')))
}

pdf('F:/tmp-wt258/jordan-avery.pdf', [
  '# Jordan Avery', 'jordan.avery@example.com | (555) 010-2040 | Toronto, ON',
  '## Experience',
  '## Senior Software Engineer, Northwind Logistics', '2021 - Present',
  '- Built a shipment tracking API in Go that serves 40 million requests a day',
  '- Cut p95 latency of the routing service from 900 ms to 180 ms with Redis caching',
  '## Software Engineer, Contoso Retail', '2018 - 2021',
  '- Wrote the inventory sync between stores and the warehouse system in Python',
  '- Added PostgreSQL read replicas and cut checkout errors by 30 percent',
  '## Education', 'BSc Computer Science, University of Waterloo, 2018',
  '## Skills', 'Go, Python, PostgreSQL, Redis, Kubernetes, AWS',
])
pdf('F:/tmp-wt258/sam-rivera.pdf', [
  '# Sam Rivera', 'sam.rivera@example.com | (555) 010-7788 | Vancouver, BC',
  '## Experience',
  '## Staff Engineer, Fabrikam Health', '2020 - Present',
  '- Designed the patient scheduling service in TypeScript used by 300 clinics',
  '- Moved nightly billing jobs to event queues and cut run time from 6 hours to 40 minutes',
  '## Backend Developer, Tailspin Air', '2016 - 2020',
  '- Built the seat inventory API in Java for 2 million bookings a month',
  '- Set up load tests that caught three capacity limits before peak season',
  '## Education', 'BEng Software Engineering, University of British Columbia, 2016',
  '## Skills', 'TypeScript, Java, Node.js, PostgreSQL, Kafka, GCP',
])

const posting = {
  '@context': 'https://schema.org', '@type': 'JobPosting',
  title: 'Senior Backend Engineer', hiringOrganization: { '@type': 'Organization', name: 'Lakeshore Freight' },
  jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: 'Remote' } },
  description: '<p>Lakeshore Freight is hiring a senior backend engineer to build APIs for shipment tracking and billing.</p><ul><li>5+ years building backend services</li><li>Experience with PostgreSQL and message queues</li><li>Comfortable owning services in production</li></ul>',
}
writeFileSync('F:/tmp-wt258/job.html', `<!doctype html><html><head><title>Senior Backend Engineer - Lakeshore Freight</title>
<script type="application/ld+json">${JSON.stringify(posting)}</script></head>
<body><main><article><h1>Senior Backend Engineer</h1><p>Lakeshore Freight, Remote</p>${posting.description}</article></main></body></html>`)
console.log('ok')
