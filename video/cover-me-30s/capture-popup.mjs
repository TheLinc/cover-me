// Captures the real popup (extension/dist) state by state at 3x, seeded through storage.
//   node capture-popup.mjs          → assets/popup/*.png, assets/popup/resume.pdf, assets/popup/resume-page.png
// Data: the website's Northwind example (web/components/landing/visuals.tsx EXAMPLE). Made-up people and companies.
import { chromium } from 'playwright'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const out = resolve('assets/popup')
mkdirSync(out, { recursive: true })
const dist = resolve('../../extension/dist')

const job = {
  title: 'Marketing Manager',
  company: 'Northwind',
  url: 'https://job-boards.greenhouse.io/northwind/jobs/4821',
  description: "You'll own our campaign strategy across email and social, manage a $1.2M budget and report results in Google Analytics. You bring strong SEO skills, hands-on HubSpot experience and a record of team leadership. Salesforce, SQL, A/B testing and copywriting are a plus.",
}
// Must-haves 70 over 5, nice-to-haves 30 over 3. HubSpot missing: 4/5 × 70 + 3/3 × 30 = 86.
const resume = {
  name: 'Alex Rivera',
  phone: '(555) 014-2290',
  email: 'alex.rivera@example.com',
  website: 'linkedin.com/in/alexrivera-example',
  experience: [
    { title: 'Marketing Lead', company: 'Brightline', location: 'Denver, CO', dates: 'Mar 2021 – Present', bullets: [
      'Owned campaign strategy for email and social, growing qualified leads 38%',
      'Managed a $1.2M paid media budget across four channels',
      'Grew organic traffic 64% with an SEO content program',
      'Lead a team of 4 and report weekly results in Google Analytics',
    ] },
    { title: 'Marketing Specialist', company: 'Fieldstone Co.', location: 'Boulder, CO', dates: 'Jun 2018 – Feb 2021', bullets: [
      'Ran A/B tests on landing pages and emails that lifted sign-ups 17%',
      'Wrote launch copy for 12 product releases',
    ] },
  ],
  education: [{ institution: 'University of Colorado Boulder', degree: 'B.S. Marketing', location: 'Boulder, CO', dates: '2014 – 2018', bullets: [] }],
  skills: 'Campaign strategy, SEO, Google Analytics, Budget management, Team leadership, A/B testing, Copywriting',
  atsScore: 86,
  atsGaps: ['HubSpot', 'Salesforce', 'SQL'],
}
const letter = `Dear Northwind team,

Your posting asks for someone who can grow demand without growing the budget. At Brightline I grew qualified leads 38% on a flat spend by rebuilding our campaign strategy around email and social.

I also own a $1.2M paid media budget across four channels, and the SEO program I started lifted organic traffic 64%. I report those results to leadership every week in Google Analytics, so the numbers behind each campaign are never a guess.

I lead a team of four marketers, and at Fieldstone I ran A/B tests on landing pages and emails that lifted sign-ups 17%. I'd welcome a conversation about bringing the same habits to Northwind.

Best regards,

Alex Rivera`

const base = {
  resume: { text: 'Alex Rivera resume', filename: 'alex-rivera-resume.pdf', updatedAt: '2026-10-14T15:00:00Z' },
  settings: { provider: 'claude', apiKey: 'seeded', mode: 'byok' },
  pageReadAgreed: true,
  activePage: 'generate',
}
const tailored = { ...base, generatePage: { tailorState: 'done', tailoredResume: resume, tailoredJob: job, activeResultTab: 'resume', supplemental: '' } }
const letterDone = { ...base, generatePage: { state: 'done', letter, job, createdAt: '2026-10-15T15:00:00Z', activeResultTab: 'letter' } }

const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'cm-vid-')), {
  channel: 'chromium', headless: true, viewport: { width: 380, height: 560 }, deviceScaleFactor: 3, acceptDownloads: true,
  args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
})
const sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker')
const url = `chrome-extension://${new URL(sw.url()).host}/src/popup/index.html`
const p = await ctx.newPage()
await p.goto(url)

async function seed(s) {
  await p.evaluate(async (s) => {
    await chrome.storage.local.clear()
    await chrome.storage.session.clear()
    await chrome.storage.local.set(s)
  }, s)
  await p.goto(url)
  await p.waitForTimeout(900)
}
const shot = (name) => p.screenshot({ path: join(out, `${name}.png`), caret: 'hide', animations: 'allow' })
// Freeze every animation at one time, so spinners land on the same frame each run.
const still = async (name, ms = 0) => {
  await p.evaluate((t) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t }), ms)
  await shot(name)
}

try {
  await seed(base)
  await shot('idle')
  await p.getByRole('button', { name: 'Tailor Resume to Job' }).hover(); await p.waitForTimeout(250); await shot('idle-hover-tailor')

  const stages = ['', 'Rewriting summary…', 'Rewriting experience (1 of 2)…', 'Rewriting experience (2 of 2)…', 'Rewriting skills…', 'Scoring…']
  for (const [k, progress] of stages.entries()) {
    await seed({ ...base, tailorJob: { id: 't1', status: 'loading', job, startedAt: Date.now(), progress } })
    for (let i = 0; i < 4; i++) await still(`tail${k}-${i}`, (650 * i) / 4)
  }

  await seed(tailored)
  await shot('result')
  await p.getByRole('button', { name: 'Download PDF' }).hover(); await p.waitForTimeout(250); await shot('result-hover-download')
  const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Download PDF' }).click()])
  await dl.saveAs(join(out, 'resume.pdf'))

  await seed({ ...base, coverJob: { id: 'c1', status: 'loading', job, startedAt: Date.now() } })
  for (let i = 0; i < 4; i++) await still(`letter-load-${i}`, (650 * i) / 4)
  await seed(letterDone)
  await shot('letter')

  // Page 1 of the downloaded PDF, rendered with pdf.js at 3x (served over http: no module imports from file://).
  const build = resolve('../../extension/node_modules/pdfjs-dist/build')
  const server = createServer((req, res) => {
    if (req.url === '/') { res.setHeader('content-type', 'text/html'); res.end('<!doctype html><body></body>'); return }
    const f = join(build, (req.url ?? '/').replace(/^\//, ''))
    if (!existsSync(f)) { res.statusCode = 404; res.end(); return }
    res.setHeader('content-type', 'text/javascript'); res.end(readFileSync(f))
  }).listen(0, '127.0.0.1')
  await new Promise((r) => server.once('listening', r))
  const origin = `http://127.0.0.1:${server.address().port}`
  const r = await ctx.newPage()
  await r.goto(origin + '/')
  const b64 = readFileSync(join(out, 'resume.pdf')).toString('base64')
  const dataUrl = await r.evaluate(async ({ origin, b64 }) => {
    const lib = await import(`${origin}/pdf.mjs`)
    lib.GlobalWorkerOptions.workerSrc = `${origin}/pdf.worker.mjs`
    const doc = await lib.getDocument({ data: Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)) }).promise
    const page = await doc.getPage(1)
    const vp = page.getViewport({ scale: 3 })
    const canvas = document.createElement('canvas')
    canvas.width = vp.width; canvas.height = vp.height
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
    return canvas.toDataURL('image/png')
  }, { origin, b64 })
  writeFileSync(join(out, 'resume-page.png'), Buffer.from(dataUrl.split(',')[1], 'base64'))
  server.close()
  console.log('done →', out)
} finally { await ctx.close() }
