// Proof for #376: the field after a field grid in the editor. Run from extension/:
//   npx tsx scripts/proof-376.ts <dist> <before|after> <outDir>
import { launchExtension } from './e2e'

const [dist, label, out] = process.argv.slice(2)
const expectGap = label === 'after' ? 10 : 0

const entry = {
  id: 'proof-376',
  createdAt: new Date().toISOString(),
  job: { title: 'Platform Engineer', company: 'Northwind Labs', description: 'Build internal tools.', url: 'https://example.com/jobs/1' },
  resume: {
    name: 'Jordan Avery', phone: '555-0142', email: 'jordan.avery@example.com', location: 'Denver, CO',
    website: 'jordanavery.example', links: ['jordanavery.example', 'github.com/jordan-avery-example'],
    headline: 'Platform Engineer',
    summary: 'Engineer who builds internal tools teams rely on.',
    experience: [{ title: 'Software Engineer', company: 'Brightline', location: 'Denver, CO', dates: '2021 to now', bullets: ['Cut deploy time 40% by moving builds to a shared cache.'] }],
    projects: [{ name: 'Queue Watch', link: 'github.com/jordan-avery-example/queue-watch', tech: 'TypeScript, Postgres, Grafana', bullets: ['Alerts on stuck jobs before customers notice.'] }],
    education: [{ institution: 'State University', degree: 'B.S. Computer Science', location: 'Boulder, CO', dates: '2017' }],
    skills: 'TypeScript, Go, Postgres',
  },
}

const { ctx, popupUrl } = await launchExtension({ dist, headless: true })
const page = await ctx.newPage()
await page.goto(popupUrl)
await page.evaluate((e) => chrome.storage.local.set({ tailoredHistory: [e] }), entry)

for (const [width, name] of [[1280, 'desktop'], [480, 'mobile']] as const) {
  await page.setViewportSize({ width, height: 900 })
  await page.goto(popupUrl.replace('popup/index.html', `editor/index.html?id=${entry.id}`))
  await page.getByText('Headline', { exact: true }).waitFor()

  const gaps = await page.evaluate(() => [...document.querySelectorAll('.ed-grid + .ed-field')].map((f) =>
    Math.round(f.getBoundingClientRect().top - f.previousElementSibling!.getBoundingClientRect().bottom)))
  if (gaps.length !== 2 || gaps.some((g) => g !== expectGap)) throw new Error(`${label} ${name}: gaps ${gaps}, expected two of ${expectGap}`)
  console.log(label, name, 'gaps', gaps)

  const section = (title: string) => page.locator('.ed-section', { has: page.getByRole('heading', { name: title, exact: true }) })
  await section('Contact').screenshot({ path: `${out}/${label}-${name}-1-contact.png` })
  await section('Projects').screenshot({ path: `${out}/${label}-${name}-2-projects.png` })
}
await ctx.close()
