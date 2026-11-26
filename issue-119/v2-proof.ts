// Proof for #119. Run: npx tsx scratch/proof.ts <before|after> <dist> <outDir>
import { writeFileSync } from 'node:fs'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { Download, Page } from 'playwright'
import { launchExtension, openEditor } from '../scripts/e2e'
import type { TailoredHistoryEntry, TailoredResume } from '../src/types'

const [side, dist, out] = process.argv.slice(2) as ['before' | 'after', string, string]
const after = side === 'after'
const fails: string[] = []
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'PASS' : 'FAIL'} [${side}] ${what}`); if (!ok) fails.push(what) }

const resume: TailoredResume = {
  name: 'Jordan Reyes',
  headline: 'Senior Backend Engineer',
  phone: '(555) 014-2290',
  email: 'jordan.reyes@example.com',
  website: 'jordanreyes.dev',
  links: ['jordanreyes.dev', 'github.com/jreyes-example'],
  location: 'Halifax, NS',
  summary: 'Backend engineer with eight years building payment and logistics services in Go and Python. Led the move of a monolith to event-driven services and cut checkout latency by 38%.',
  experience: [
    { title: 'Senior Backend Engineer', company: 'Harbourline Freight', location: 'Halifax, NS', dates: 'Mar 2021 – Present', bullets: [
      'Designed a Kafka-based shipment event pipeline handling 4M events a day with exactly-once delivery.',
      'Cut p99 checkout latency from 820 ms to 510 ms by moving pricing to a cached Go service.',
      'Mentored four engineers and ran the on-call rotation for the payments team.',
    ] },
    { title: 'Backend Engineer', company: 'Tidewater Payments', location: 'Remote', dates: 'Jun 2017 – Feb 2021', bullets: [
      'Built the PostgreSQL ledger behind $40M a month in card payments.',
      'Wrote the reconciliation job that matched 99.97% of settlements without manual review.',
      'Moved CI from Jenkins to GitHub Actions, cutting build time from 22 to 7 minutes.',
    ] },
  ],
  projects: [{ name: 'queue-lens', tech: 'Go, SQLite', link: 'github.com/jreyes-example/queue-lens', bullets: ['A terminal dashboard for Kafka consumer lag, 600 stars.'] }],
  education: [{ institution: 'Dalhousie University', degree: 'BSc, Computer Science', location: 'Halifax, NS', dates: '2013 – 2017', bullets: [] }],
  skills: 'Languages: Go, Python, SQL, TypeScript\nInfrastructure: Kafka, PostgreSQL, Redis, AWS, Terraform, Docker',
  certifications: ['AWS Certified Developer – Associate'],
  atsScore: 84,
  atsGaps: ['gRPC'],
}
const job = { title: 'Senior Backend Engineer', company: 'Northwind Logistics', url: 'https://jobs.example/northwind/42', description: 'Go, Kafka, PostgreSQL.' }
const entry = (id: string, r: TailoredResume = resume): TailoredHistoryEntry => ({ id, job, resume: r, createdAt: '2026-11-20T15:00:00.000Z' })

const SIGNED_IN = {
  session: { access_token: 'proof', refresh_token: 'proof', expires_at: 4102444800, user: { id: '00000000-0000-4000-8000-000000000119', email: 'jordan.reyes@example.com' } },
  resume: { text: 'Jordan Reyes resume', filename: 'resume.pdf', updatedAt: '2026-11-20T15:00:00.000Z' },
  pageReadAgreed: true,
}
const PRO = { settings: { mode: 'hosted' }, cachedTier: 'hosted_pro' }
const FREE = { settings: { mode: 'hosted' }, cachedTier: 'hosted_free' }
const BYOK = { settings: { mode: 'byok', provider: 'claude', apiKey: 'x' } }

async function pdfFacts(download: Download) {
  const path = await download.path()
  const bytes = new Uint8Array(await (await import('node:fs/promises')).readFile(path!))
  const pdf = await getDocument({ data: bytes, verbosity: 0 }).promise
  const { items, styles } = await (await pdf.getPage(1)).getTextContent()
  const texts = items.filter((i) => 'str' in i && i.str.trim()) as { str: string; transform: number[]; fontName: string }[]
  const name = texts.find((t) => t.str === 'Jordan Reyes')!
  return { family: styles[name.fontName].fontFamily, nameSize: name.transform[0], text: texts.map((t) => t.str).join(' ') }
}

async function downloadPdf(page: Page, menuButton = page.getByRole('button', { name: 'Download' }).first()) {
  await menuButton.click()
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /^PDF/ }).click()])
  return pdfFacts(download)
}

async function seed(page: Page, popupUrl: string, data: Record<string, unknown>) {
  await page.goto(popupUrl)
  await page.evaluate(async (d) => { await chrome.storage.local.clear(); await chrome.storage.local.set(d) }, data)
}

const shot = (page: Page, name: string) => page.screenshot({ path: `${out}/${side}-${name}.png` })

const { ctx, popupUrl } = await launchExtension({ dist, headless: true })
try {
  // 1. Editor tab as Pro: pick Modern, preview and download follow. (#119)
  const ed = await ctx.newPage()
  await ed.setViewportSize({ width: 1400, height: 900 })
  await seed(ed, popupUrl, PRO)
  await openEditor(ed, popupUrl, entry('r1'))
  await ed.locator('.ed-pages canvas').first().waitFor()
  await ed.waitForTimeout(800)
  await shot(ed, '1-editor-pro-open')
  const bar = ed.locator('summary', { hasText: 'Template' })
  check(await bar.count() === (after ? 1 : 0), after ? 'the editor shows a Template bar' : 'the editor has no Template picker')
  if (after) {
    check(await bar.textContent() === 'TemplateClassicChange ', `the bar shows the current template, collapsed (${await bar.textContent()})`)
    check(!(await ed.getByRole('radio', { name: 'Modern' }).isVisible()), 'the cards stay hidden until Change')
    await bar.click()
    check(await ed.getByRole('radio', { name: 'Classic' }).isChecked(), 'a resume with no template opens on Classic')
    await shot(ed, '1b-editor-pro-expanded')
    await ed.getByText('Modern', { exact: true }).click()
    await ed.waitForTimeout(1500)
    await shot(ed, '2-editor-pro-modern')
    const pdf = await downloadPdf(ed)
    check(pdf.family === 'sans-serif', `editor download after picking Modern is sans-serif (${pdf.family})`)
    const saved = await ed.evaluate(async () => (await chrome.storage.local.get(['tailoredHistory', 'resumeTemplate'])) as Record<string, unknown>)
    const r = (saved.tailoredHistory as TailoredHistoryEntry[])[0].resume
    check(r.template === 'modern' && !r.editedAt, `History saved template ${r.template}, editedAt ${r.editedAt ?? 'unset'}`)
    check(saved.resumeTemplate === 'modern', 'Modern is the default for the next resume')
    check(!(await ed.getByText('Scored before your edits').count()), 'a template alone does not mark the score stale')
    await ed.getByText('Classic', { exact: true }).click()
    await ed.waitForTimeout(1500)
    const back = await ed.evaluate(async () => ((await chrome.storage.local.get('tailoredHistory')).tailoredHistory as TailoredHistoryEntry[])[0].resume.template)
    check(back === 'classic', `switching back to Classic is saved (${back})`)
  } else {
    const pdf = await downloadPdf(ed)
    check(pdf.family === 'serif', `editor download is serif (${pdf.family})`)
  }
  await ed.close()

  // 2. Editor as Free and with an own key: new templates locked, upgrade shown, Classic works. (#119)
  for (const [label, data] of [['free', FREE], ['byok', BYOK]] as const) {
    const p = await ctx.newPage()
    await p.setViewportSize({ width: 1400, height: 900 })
    await seed(p, popupUrl, data)
    await openEditor(p, popupUrl, entry(`r-${label}`))
    await p.locator('.ed-pages canvas').first().waitFor()
    await p.waitForTimeout(800)
    await shot(p, `3-editor-${label}`)
    if (after) {
      check(await p.getByText('3 more with Pro').isVisible(), `${label}: the collapsed bar says 3 more with Pro`)
      await p.locator('summary', { hasText: 'Template' }).click()
      await shot(p, `3b-editor-${label}-expanded`)
      const locked = await Promise.all(['Modern', 'Compact', 'Minimal'].map((n) => p.getByRole('radio', { name: n }).isDisabled()))
      check(locked.every(Boolean), `${label}: Modern, Compact and Minimal are locked`)
      check(await p.getByRole('radio', { name: 'Classic' }).isEnabled(), `${label}: Classic can be picked`)
      check(await p.getByRole('button', { name: /Upgrade, \$15\/mo/ }).isVisible(), `${label}: the upgrade button shows`)
    }
    const pdf = await downloadPdf(p)
    check(pdf.family === 'serif' && pdf.nameSize === 26, `${label}: Classic download works (${pdf.family}, name ${pdf.nameSize}pt)`)
    await p.close()
  }

  // 3. Popup resume result as Pro: the Template shortcut. (#119)
  const pop = await ctx.newPage()
  await pop.setViewportSize({ width: 420, height: 640 })
  await seed(pop, popupUrl, { ...PRO, ...SIGNED_IN, tailoredHistory: [entry('r2')], generatePage: {
    state: 'idle', inputMode: 'auto', tailorState: 'done', tailoredResume: resume, tailoredJob: job, tailoredEntryId: 'r2', activeResultTab: 'resume', compact: false, trim: false, includeSummary: true,
  } })
  await pop.reload()
  await pop.getByRole('button', { name: 'Download' }).first().waitFor()
  await pop.locator('.page-content').evaluate((el) => el.scrollTo(0, el.scrollHeight)).catch(() => {})
  await pop.waitForTimeout(400)
  await shot(pop, '4-popup-pro')
  const popBar = pop.locator('summary', { hasText: 'Template' })
  check(await popBar.count() === (after ? 1 : 0), after ? 'the popup result has a Template bar' : 'the popup result has no Template control')
  if (after) {
    await popBar.click()
    await pop.getByText('Compact', { exact: true }).click()
    await pop.locator('.page-content').evaluate((el) => el.scrollTo(0, el.scrollHeight)).catch(() => {})
    await pop.waitForTimeout(500)
    await shot(pop, '5-popup-pro-compact')
    const pdf = await downloadPdf(pop)
    check(pdf.family === 'serif' && pdf.nameSize === 20, `popup download after picking Compact has the 20pt Compact name (${pdf.nameSize}pt)`)
  }
  await pop.close()

  // 5. Settings: the default for the next resume, before there is one. (#119)
  const set = await ctx.newPage()
  await set.setViewportSize({ width: 420, height: 640 })
  await seed(set, popupUrl, { ...PRO, resumeTemplate: undefined })
  await set.reload()
  await set.getByRole('button', { name: 'Settings' }).click()
  const heading = set.getByRole('heading', { name: 'Resume template' })
  check(await heading.count() === (after ? 1 : 0), after ? 'Settings has a Resume template choice' : 'Settings has no template choice')
  if (after) {
    await heading.scrollIntoViewIfNeeded()
    await set.locator('summary', { hasText: 'Template' }).click()
    await set.getByText('Minimal', { exact: true }).click()
    await set.waitForTimeout(300)
    await shot(set, '8-settings-minimal')
    const def = await set.evaluate(async () => (await chrome.storage.local.get('resumeTemplate')).resumeTemplate)
    check(def === 'minimal', `picking Minimal in Settings saves it as the default (${def})`)
  } else {
    await shot(set, '8-settings')
  }
  await set.close()

  // 4. A resume made before templates downloads as Classic from History. (#119)
  const hist = await ctx.newPage()
  await hist.setViewportSize({ width: 420, height: 640 })
  await seed(hist, popupUrl, { ...PRO, ...SIGNED_IN, tailoredHistory: [entry('old')] })
  await hist.reload()
  await hist.getByRole('button', { name: 'History' }).click()
  await hist.getByRole('button', { name: 'View' }).click()
  await hist.waitForTimeout(500)
  await shot(hist, '6-history-old')
  const old = await downloadPdf(hist, hist.getByRole('button', { name: 'Download' }).last())
  check(old.family === 'serif' && old.nameSize === 26, `History download of a pre-template resume is Classic (${old.family}, ${old.nameSize}pt)`)
  check(old.text.includes('jordan.reyes@example.com'), 'its text is real, copyable text')
  await hist.close()
} finally {
  await ctx.close()
}
writeFileSync(`${out}/${side}-result.txt`, fails.length ? `FAILED:\n${fails.join('\n')}\n` : 'all checks passed\n')
console.log(fails.length ? `${fails.length} failed` : 'all checks passed')
process.exit(fails.length ? 1 : 0)
