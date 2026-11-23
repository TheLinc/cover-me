// usage: node walk342.mjs <dist dir> <out dir> <label>
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
const require = createRequire('F:/worktrees/cover-me/t3-a606f34c-827d99b7c42a5b84/extension/package.json')
const { chromium } = require('playwright')

const [dist, out, label] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const profile = join(out, `profile-${label}`)
rmSync(profile, { recursive: true, force: true })
const results = {}
const check = (name, ok, detail = '') => { results[name] = { ok, detail }; console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`) }

const ctx = await chromium.launchPersistentContext(profile, {
  channel: 'chromium', headless: false,
  args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
  viewport: { width: 380, height: 560 },
  ...(process.env.RECORD ? { recordVideo: { dir: join(out, 'video-' + label), size: { width: 380, height: 560 } } } : {}),
})
let [sw] = ctx.serviceWorkers()
if (!sw) sw = await ctx.waitForEvent('serviceworker')
const id = new URL(sw.url()).host
for (const p of ctx.pages()) if (!p.url().startsWith('about:blank')) await p.close().catch(() => {})

const now = Date.now()
const iso = (ms) => new Date(ms).toISOString()
const job = { title: 'Software Engineer', company: 'Northwind Labs', description: 'Build services in Go and TypeScript. Kubernetes, GraphQL, Terraform. '.repeat(5), url: 'https://jobs.example.com/northwind/123' }
const tailored = {
  name: 'Pat Doe', phone: '', email: 'pat@example.com', website: '',
  summary: 'Software Engineer with six years of Go and TypeScript, building payment services at scale.',
  experience: [{ title: 'Backend Developer', company: 'Acme', dates: '2020 to now', bullets: ['Built things'] }],
  education: [], atsScore: 63, atsScoreBefore: 52,
  atsGaps: ['Kubernetes', 'GraphQL', 'Terraform', 'gRPC', 'Datadog', 'Kafka', 'Redis', 'PostgreSQL', 'CI/CD pipelines', 'Observability'],
}
const letter = 'Dear hiring team,\n\n' + 'I am writing about the Software Engineer role at Northwind Labs. '.repeat(14) + '\n\nBest,\nPat'
const seed = {
  settings: { apiKey: 'sk-fake', mode: 'byok' },
  resume: { text: 'Pat Doe resume', filename: 'resume.pdf', updatedAt: iso(now) },
  pageReadAgreed: false, answersNews: 'seen', activePage: 'generate',
  candidateContext: 'Referred by Jane Chen, a staff engineer on the platform team. Open to relocating.',
  history: [
    { id: 'l1', job, letter, createdAt: iso(now - 2 * 86400_000) },
    { id: 'l2', job: { ...job, title: 'Platform Engineer', company: 'Contoso', url: 'https://jobs.example.com/contoso/9' }, letter: 'Dear Contoso,\n\nHello.', createdAt: iso(now - 20 * 86400_000) },
  ],
  tailoredHistory: [{ id: 't1', job, resume: tailored, createdAt: iso(now - 2 * 86400_000) }],
}

const popup = await ctx.newPage()
await popup.goto(`chrome-extension://${id}/src/popup/index.html`)
await popup.evaluate((s) => chrome.storage.local.clear().then(() => chrome.storage.local.set(s)), seed)
const shot = (name) => popup.screenshot({ path: join(out, `${label}-${name}.png`) })
const open = async (extra = {}) => {
  await popup.evaluate((s) => chrome.storage.local.set(s), extra)
  await popup.reload()
  await popup.waitForTimeout(900)
}
const inView = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); const nav = document.querySelector('nav, .nav')?.getBoundingClientRect().top ?? innerHeight; return r.top >= 0 && r.bottom <= nav })

// 1. Start screen
await open()
await shot('1-start')
const tailorBox = await popup.locator('.tailor-summary').count()
check('tailor options behind one summary line', tailorBox === 1 && !(await popup.getByLabel('Remove irrelevant bullets').isVisible().catch(() => false)),
  tailorBox ? await popup.locator('.tailor-summary').innerText() : 'no summary line')
check('About you label, no "Candidate context"', (await popup.getByText('Candidate context').count()) === 0 && (await popup.getByText('About you').count()) > 0)
const firstBtnTop = await popup.locator('.generate-cta').evaluate((el) => el.firstElementChild.getBoundingClientRect().top - document.querySelector('.popup-bar').getBoundingClientRect().bottom)
check('no blank band above the buttons', firstBtnTop < 40, `gap ${Math.round(firstBtnTop)}px`)
if (tailorBox) {
  await popup.locator('.tailor-summary').focus()
  await popup.keyboard.press('Enter')
  await popup.waitForTimeout(300)
  check('Enter opens the tailor options', await popup.getByText('Remove irrelevant bullets').isVisible())
  await popup.getByText('Remove irrelevant bullets').click()
  await popup.waitForTimeout(300)
  await shot('1b-start-options-open')
  await open()
  const summary = await popup.locator('.tailor-summary').innerText()
  check('choices survive reopening', summary.includes('Trim bullets'), summary)
}
const ctxToggle = popup.locator('.context-toggle')
await shot('1c-start-about-you-closed')
check('closed About you shows a one-line preview', (await ctxToggle.innerText()).includes('Referred by Jane Chen'), await ctxToggle.innerText())
await ctxToggle.focus()
await popup.keyboard.press('Enter')
const h0 = await popup.locator('.context-panel, .supplemental-input').first().evaluate((el) => el.getBoundingClientRect().height)
await popup.waitForTimeout(80)
const h1 = await popup.locator('.context-panel, .supplemental-input').first().evaluate((el) => el.getBoundingClientRect().height)
await popup.waitForTimeout(400)
const h2 = await popup.locator('.context-panel, .supplemental-input').first().evaluate((el) => el.getBoundingClientRect().height)
check('opening About you focuses its text box', await popup.evaluate(() => document.activeElement?.tagName === 'TEXTAREA'))
check('About you opens with a height transition', h1 > h0 && h1 < h2, `${Math.round(h0)} -> ${Math.round(h1)} -> ${Math.round(h2)}`)
const ta = popup.getByLabel('About you').or(popup.locator('.supplemental-input')).first()
const t0 = await ta.evaluate((el) => el.getBoundingClientRect().height)
await ta.fill('Line one\nLine two\nLine three\nLine four\nLine five\nLine six\nLine seven\nLine eight\nLine nine\nLine ten\nLine eleven')
const t1 = await ta.evaluate((el) => el.getBoundingClientRect().height)
const fs = await ta.evaluate((el) => getComputedStyle(el).fontSize)
check('About you grows to a cap while typing, 12px text', t1 > t0 && t1 <= 160 && fs === '12px', `${Math.round(t0)} -> ${Math.round(t1)}, ${fs}`)
await shot('1d-start-about-you-open')
await popup.emulateMedia({ reducedMotion: 'reduce' })
await ctxToggle.click(); await popup.waitForTimeout(50); await ctxToggle.click()
const r0 = await popup.locator('.context-panel, .supplemental-input').first().evaluate((el) => el.getBoundingClientRect().height)
await popup.waitForTimeout(20)
check('reduced motion opens instantly', r0 >= t1 - 2, `${Math.round(r0)}px right after click`)
await popup.emulateMedia({ reducedMotion: 'no-preference' })

// 2. Tailored result
await open({ generatePage: { state: 'idle', inputMode: 'auto', tailorState: 'done', tailoredResume: tailored, tailoredJob: job, tailoredEntryId: 't1', supplemental: '', compact: false, trim: true, includeSummary: true }, ringFilledFor: 't1' })
await shot('2-result')
const dl = popup.getByRole('button', { name: /Download/ })
check('Download, Edit, New in view without scrolling', await inView(dl) && await inView(popup.getByRole('button', { name: 'New' })))
await popup.locator('.page-content').evaluate((el) => el.scrollTo(0, el.scrollHeight / 2))
await popup.waitForTimeout(200)
check('actions stay in view while scrolling', await inView(dl))
await popup.locator('.page-content').evaluate((el) => el.scrollTo(0, 0))
const body = await popup.locator('.page').innerText()
check('no ATS or Missing wording on the result', !/ATS|Missing/.test(body), (body.match(/.*(ATS|Missing).*/g) || []).join(' | '))
const aria = await popup.locator('.score-ring').getAttribute('aria-label')
check('score ring screen-reader label matches', /^Job match 63/.test(aria ?? ''), aria)
check('add-experience box starts collapsed', !(await popup.locator('#tailor-supplemental').isVisible().catch(() => false)))
const doneTxt = await popup.locator('.popup-status').innerText()
const doneStyle = await popup.locator('.popup-status').evaluate((el) => getComputedStyle(el).color)
check('Done status is muted text with a check, not a button look', /Done/.test(doneTxt) && doneStyle === 'rgb(166, 163, 198)' && await popup.locator('.popup-status svg').count() === 1, doneStyle)
await open({ generatePage: { state: 'idle', inputMode: 'auto', tailorState: 'done', tailoredResume: tailored, tailoredJob: job, tailoredEntryId: 't1', supplemental: '2yr GraphQL from freelance', compact: false, trim: true, includeSummary: true }, ringFilledFor: 't1' })
check('add-experience starts open when it holds text', await popup.locator('#tailor-supplemental').isVisible().catch(() => false) || await popup.getByText('2yr GraphQL from freelance').isVisible().catch(() => false))
await shot('2b-result-with-note')

// 3. Cover letter result
await open({ generatePage: { state: 'done', inputMode: 'auto', letter, job, createdAt: iso(now), tailorState: 'idle' } })
await shot('3-letter')
const copyBtn = popup.getByRole('button', { name: /^Copy/ })
check('Copy, PDF, New in view without scrolling', await inView(copyBtn) && await inView(popup.getByRole('button', { name: 'PDF' })))

// 4. History
await open({ generatePage: { state: 'idle', tailorState: 'idle', inputMode: 'auto' }, activePage: 'history' })
await shot('4-history')
const dates = await popup.locator('.job-card-date').allInnerTexts()
check('no History date is a bare weekday', dates.every((d) => !/(^|· )(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/.test(d.trim())), dates.join(' | '))
await popup.getByRole('button', { name: 'View' }).first().click()
await popup.waitForTimeout(200)
check('one click on View shows the letter', await popup.getByText('I am writing about the Software Engineer role').first().isVisible())
await shot('4b-history-view')
await popup.getByRole('button', { name: 'Collapse' }).first().click().catch(() => {})
await popup.getByRole('button', { name: 'Delete' }).first().click()
await popup.waitForTimeout(300)
await shot('4c-history-deleted-undo')
const stored1 = await popup.evaluate(() => chrome.storage.local.get(['history', 'tailoredHistory']))
check('Delete removes nothing at once', stored1.history.length === 2 && stored1.tailoredHistory.length === 1)
const undo = popup.getByRole('button', { name: 'Undo' })
const undoFocused = await undo.evaluate((el) => el === document.activeElement).catch(() => false)
check('Undo shows and has focus', await undo.isVisible().catch(() => false) && undoFocused)
if (await undo.isVisible().catch(() => false)) {
  await popup.keyboard.press('Enter')
  await popup.waitForTimeout(6000)
  const stored2 = await popup.evaluate(() => chrome.storage.local.get(['history', 'tailoredHistory']))
  check('Undo restores the card and nothing is deleted', stored2.history.length === 2 && await popup.getByText('Software Engineer').first().isVisible())
  await popup.getByRole('button', { name: 'Delete' }).first().click()
  await popup.waitForTimeout(6000)
  const stored3 = await popup.evaluate(() => chrome.storage.local.get(['history', 'tailoredHistory']))
  check('after the undo window the delete runs', stored3.history.length === 1 && stored3.tailoredHistory.length === 0)
  await shot('4d-history-after-delete')
  // Close the popup mid-window: the worker still deletes.
  await popup.getByRole('button', { name: 'Delete' }).first().click()
  await popup.waitForTimeout(300)
  await popup.close()
  await new Promise((r) => setTimeout(r, 1500))
  const stored4 = await sw.evaluate(() => chrome.storage.local.get(['history']))
  check('closing the popup mid-undo still deletes', stored4.history.length === 0)
}

// 5. Resume and Settings
const p2 = await ctx.newPage()
await p2.goto(`chrome-extension://${id}/src/popup/index.html`)
await p2.evaluate(() => chrome.storage.local.set({ activePage: 'resume' })); await p2.reload(); await p2.waitForTimeout(700)
const resumeSub = await p2.locator('.page-subtitle').innerText()
const { readdirSync, readFileSync } = await import('node:fs')
const bundle = readdirSync(join(dist, 'assets')).filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(dist, 'assets', f), 'utf8')).join(' ')
check('Resume subtitle mentions tailored resumes, upload says "Reading your resume…"', /tailored resume/i.test(resumeSub) && !bundle.includes('Parsing…') && bundle.includes('Reading your resume…'), resumeSub)
await p2.screenshot({ path: join(out, `${label}-5-resume.png`) })
await p2.evaluate(() => chrome.storage.local.set({ activePage: 'settings' })); await p2.reload(); await p2.waitForTimeout(700)
const sub = await p2.locator('.page-subtitle').innerText()
check('Settings subtitle has no "API key"', !/API key/.test(sub), sub)
await p2.screenshot({ path: join(out, `${label}-6-settings.png`) })

writeFileSync(join(out, `${label}-results.json`), JSON.stringify(results, null, 2))
await ctx.close()
