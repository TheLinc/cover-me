// Proof for #266: node proof.mjs <before|after> <dist dir> <out dir>
// Seeds chrome.storage.local with made-up data and drives the popup, History and the Editor.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const [, , label, dist, out] = process.argv
const after = label === 'after'
fs.mkdirSync(out, { recursive: true })
const profile = fs.mkdtempSync(path.join(os.tmpdir(), `proof266-${label}-`))
const ctx = await chromium.launchPersistentContext(profile, {
  channel: 'chromium',
  headless: false,
  args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`, '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'],
  viewport: { width: 380, height: 560 },
})
let [sw] = ctx.serviceWorkers()
if (!sw) sw = await ctx.waitForEvent('serviceworker')
const id = new URL(sw.url()).host
for (const p of ctx.pages()) if (!p.url().startsWith('about:')) await p.close().catch(() => {})
ctx.on('page', (p) => { if (p.url().includes('welcome')) p.close().catch(() => {}) })

const DAY = 864e5
const iso = (daysAgo) => new Date(Date.now() - daysAgo * DAY).toISOString()
const job = { title: 'Product Designer', company: 'Northwind Labs', url: 'https://example.com/jobs/1', description: 'Design product flows.' }
const resume = {
  name: 'Sam Rivera', phone: '555-0100', email: 'sam@example.com', website: '', location: 'Springfield',
  summary: 'Product designer with six years of web and mobile work.',
  experience: [{ title: 'Product Designer', company: 'Acme Studio', location: 'Remote', dates: '2021 - Now', bullets: ['Redesigned the checkout flow, lifting completed orders by 12%.', 'Ran 40 user interviews a quarter.'] }],
  education: [{ institution: 'State University', degree: 'BFA Design', location: 'Springfield', dates: '2014 - 2018', bullets: [] }],
  skills: 'Figma, prototyping, user research',
}
const letter = Array.from({ length: 6 }, (_, i) => `Paragraph ${i + 1}. I would like to apply for the Product Designer role at Northwind Labs. At Acme Studio I redesigned the checkout flow and ran user interviews every quarter, and I would bring the same care to your product team.`).join('\n\n')
const entries = (n, daysAgo, account) => Array.from({ length: n }, (_, i) => ({ id: `l${i}`, job, letter: 'Dear team,', createdAt: iso(daysAgo + i), ...(account ? { account } : {}) }))
const base = {
  settings: { provider: 'claude', apiKey: 'made-up', mode: 'byok' },
  resume: { text: 'Sam Rivera', filename: 'resume.pdf', updatedAt: iso(9) },
  answersNewsSeen: true, onboarded: true,
}
const generationCount = { count: 3, firstAt: iso(3) }

async function popup(seed) {
  const page = await ctx.newPage()
  await page.setViewportSize({ width: 380, height: 560 })
  await page.goto(`chrome-extension://${id}/src/popup/index.html`)
  await page.evaluate(async (s) => { await chrome.storage.local.clear(); await chrome.storage.local.set(s) }, { ...base, ...seed })
  await page.reload()
  await page.waitForTimeout(800)
  return page
}
const storage = (page, key) => page.evaluate((k) => chrome.storage.local.get(k).then((r) => r[k] ?? null), key)
const shot = (page, name) => page.screenshot({ path: path.join(out, `${label}-${name}.png`) })
const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`)
}
async function inView(page, sel) {
  return page.evaluate((s) => {
    const el = document.querySelector(s)
    if (!el) return false
    const r = el.getBoundingClientRect()
    return r.top >= 0 && r.bottom <= innerHeight
  }, sel)
}
const card = '.review-ask'
async function download(page, scope, option) {
  await page.locator(`${scope} .download-menu > button`).first().click()
  await page.locator(`${scope} [role="menuitem"]`, { hasText: option }).first().click()
  await page.waitForTimeout(600)
}
const tailored = (score, before) => ({ ...resume, atsScore: score, atsScoreBefore: before, atsGaps: score < 80 ? ['Accessibility audits'] : [] })
const resumeResult = (r) => ({ generatePage: { state: 'idle', inputMode: 'auto', tailorState: 'done', tailoredResume: r, tailoredJob: job, tailoredEntryId: 't0', activeResultTab: 'resume' }, ringFilledFor: 't0', tailoredHistory: [{ id: 't0', job, resume: r, createdAt: iso(3) }] })

// 1. Resume whose score rose: card directly under the score, without scrolling.
{
  const page = await popup({ ...resumeResult(tailored(86, 62)), generationCount, history: entries(2, 4) })
  await download(page, '.letter-container', 'PDF')
  await page.waitForTimeout(400)
  await shot(page, '1-resume-gain')
  const placement = await page.evaluate(() => document.querySelector('.review-ask')?.previousElementSibling?.className ?? null)
  if (after) check('1 card right under the score, in view', placement === 'ats-result' && await inView(page, card), placement)
  else check('1 card at the bottom, after the result', placement === 'letter-container', placement)
  await page.close()
}

// 2. Resume with no gain and a score under 80: card just above the download row.
{
  const page = await popup({ ...resumeResult(tailored(64, 63)), generationCount, history: entries(2, 4) })
  await download(page, '.letter-container', 'PDF')
  await page.waitForTimeout(400)
  await shot(page, '2-resume-no-gain')
  const next = await page.evaluate(() => document.querySelector('.review-ask')?.nextElementSibling?.className ?? null)
  if (after) check('2 card just above the download row, in view', next === 'letter-actions' && await inView(page, card), next)
  else check('2 card at the bottom', next === null && await page.locator(card).count() === 1)
  await page.close()
}

// 3. Long letter: card above the Copy/PDF row.
{
  const page = await popup({ generatePage: { state: 'done', inputMode: 'auto', letter, job, createdAt: iso(0), tailorState: 'idle', activeResultTab: 'letter' }, generationCount })
  await page.locator('.letter-actions .btn-primary').click()
  await page.waitForTimeout(800)
  await shot(page, '3-letter')
  const prev = await page.evaluate(() => document.querySelector('.review-ask')?.previousElementSibling?.className ?? null)
  const both = await inView(page, card) && await inView(page, '.letter-actions')
  if (after) check('3 letter card right under the Copy row, both in view', prev === 'letter-actions' && both, prev)
  if (after) {
    await page.locator(`${card} .review-ask-dismiss`).click()
    const focused = await page.evaluate(() => document.activeElement?.textContent ?? '')
    check('3 Not now puts focus back on the Copy button', focused.includes('Cop'), focused)
  }
  else check('3 letter card after the letter block', prev === 'letter-container' && both, prev)
  await page.close()
}

// 4. Backfill: 3 history entries over a day old, no generationCount.
{
  const page = await popup({ activePage: 'history', history: entries(3, 2) })
  await page.locator('.job-card button', { hasText: 'View' }).first().click()
  await page.locator('.artifact-actions button', { hasText: 'Copy' }).first().click()
  await page.waitForTimeout(800)
  await shot(page, '4-history-backfill')
  const n = await page.locator(card).count()
  check(after ? '4 History copy shows the card from history alone' : '4 no card: no generationCount, and History has no hook', after ? n === 1 : n === 0)
  await page.close()
}

// 5. A previous user's entries don't count.
{
  const page = await popup({ activePage: 'history', history: entries(3, 2, 'other') })
  await page.locator('.job-card button', { hasText: 'View' }).first().click()
  await page.locator('.artifact-actions button', { hasText: 'Copy' }).first().click()
  await page.waitForTimeout(800)
  check("5 'other' entries don't qualify", await page.locator(card).count() === 0)
  await page.close()
}

// 6. History resume download shows the card (generationCount lower than history).
{
  const page = await popup({ activePage: 'history', generationCount: { count: 1, firstAt: iso(0) }, history: entries(2, 3), tailoredHistory: [{ id: 't0', job, resume: tailored(86, 62), createdAt: iso(2) }] })
  await page.locator('.job-card button', { hasText: 'View' }).first().click()
  await download(page, '.artifact', 'PDF')
  await page.waitForTimeout(400)
  await shot(page, '6-history-resume')
  const n = await page.locator(card).count()
  check(after ? '6 History resume download shows the card' : '6 History resume download shows nothing', after ? n === 1 : n === 0)
  await page.close()
}

// 7. Editor download shows the card.
{
  const seedPage = await popup({ generationCount, tailoredHistory: [{ id: 't0', job, resume: tailored(86, 62), createdAt: iso(3) }] })
  const ed = await ctx.newPage()
  await ed.setViewportSize({ width: 1280, height: 720 })
  await ed.goto(`chrome-extension://${id}/src/editor/index.html?id=t0`)
  await ed.waitForSelector('.ed-bar .download-menu > button')
  await download(ed, '.ed-bar', 'PDF')
  await ed.waitForTimeout(600)
  await ed.screenshot({ path: path.join(out, `${label}-7-editor.png`) })
  const n = await ed.locator(card).count()
  check(after ? '7 Editor download shows the card' : '7 Editor download shows nothing', after ? n === 1 : n === 0)
  if (after) {
    await ed.locator(`${card} .review-ask-dismiss`).click()
    const focused = await ed.evaluate(() => `${document.activeElement?.tagName}`)
    check('7 Not now in the Editor keeps focus on a control', focused !== 'BODY', focused)
  }
  await ed.close()
  await seedPage.close()
}

// 8. Closing the popup within 2 seconds of a copy keeps the showing unused.
{
  const page = await ctx.newPage()
  await page.goto(`chrome-extension://${id}/src/popup/index.html`)
  await page.evaluate(async (s) => { await chrome.storage.local.clear(); await chrome.storage.local.set(s) }, { ...base, generatePage: { state: 'done', inputMode: 'auto', letter, job, createdAt: iso(0), tailorState: 'idle', activeResultTab: 'letter' }, generationCount })
  await page.reload()
  await page.waitForTimeout(800)
  await page.locator('.letter-actions .btn-primary').click()
  await page.waitForTimeout(700)
  const shownCard = await page.locator(card).count()
  await page.close()
  const reader = await ctx.newPage()
  await reader.goto(`chrome-extension://${id}/src/welcome/index.html`)
  const ask = await storage(reader, 'reviewAsk')
  check(after ? '8 closed within 2 s: reviewAsk unchanged' : '8 closed within 2 s: showing already used', shownCard === 1 && (after ? ask === null : ask?.shown === 1), JSON.stringify(ask))
  await reader.close()
}

// 9. Waiting 2 seconds counts the showing.
{
  const page = await popup({ generatePage: { state: 'done', inputMode: 'auto', letter, job, createdAt: iso(0), tailorState: 'idle', activeResultTab: 'letter' }, generationCount })
  await page.locator('.letter-actions .btn-primary').click()
  await page.waitForTimeout(2600)
  const ask = await storage(page, 'reviewAsk')
  check('9 on screen 2 s: shown is 1', ask?.shown === 1 && ask?.done === false, JSON.stringify(ask))
  await page.close()
}

// 10. The card's links: Send feedback doesn't end the ask, Rate does, no GitHub link.
for (const link of ['Send feedback', 'Rate Cover Me']) {
  const page = await popup({ generatePage: { state: 'done', inputMode: 'auto', letter, job, createdAt: iso(0), tailorState: 'idle', activeResultTab: 'letter' }, generationCount })
  await page.locator('.letter-actions .btn-primary').click()
  await page.waitForTimeout(800)
  if (link === 'Send feedback') {
    await shot(page, '10-card-links')
    const github = await page.locator(`${card} a`, { hasText: 'Star on GitHub' }).count()
    check(after ? '10 no GitHub link on the card' : '10 GitHub link on the card', after ? github === 0 : github === 1)
  }
  const [tab] = await Promise.all([ctx.waitForEvent('page'), page.locator(`${card} a`, { hasText: link }).click()])
  await tab.close().catch(() => {})
  await page.waitForTimeout(300)
  const ask = await storage(page, 'reviewAsk')
  if (link === 'Rate Cover Me') check('10 Rate ends the ask', ask?.done === true, JSON.stringify(ask))
  else check(after ? '10 Send feedback leaves the ask open and counts the showing' : '10 Send feedback ends the ask', after ? ask?.done === false && ask?.shown === 1 : ask?.done === true, JSON.stringify(ask))
  await page.close()
}

// 11. Settings keeps all three links.
{
  const page = await popup({ activePage: 'settings' })
  const links = await page.locator('.page-read-setting a').allTextContents()
  await page.locator('#review-links-title').scrollIntoViewIfNeeded()
  await shot(page, '11-settings')
  check('11 Settings has all three links', ['Rate Cover Me', 'Star on GitHub', 'Send feedback'].every((t) => links.includes(t)), links.join(', '))
  await page.close()
}

await ctx.close()
fs.rmSync(profile, { recursive: true, force: true })
const failed = results.filter((r) => !r.ok)
console.log(`${label}: ${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
