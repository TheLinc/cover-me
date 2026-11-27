// node compat.mjs <label> <old dist> [new dist]
// The store build (master) signed in against whichever functions are being served.
// With a new dist, also one account used from the old build (X) and the new one (Y).
import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
const require = createRequire('F:/worktrees/cover-me/t3-c59daae8-f7aff07b29605f3f/extension/package.json')
const { chromium } = require('playwright')

const [label, oldDist, newDist] = process.argv.slice(2)
const HERE = new URL('.', import.meta.url).pathname.replace(/^\/(\w:)/, '$1')
const OUT = `${HERE}compat-${label}`
const PDF = `${HERE}Robin Example Resume.pdf`
const PDF_B = `${HERE}Sam Other Resume.pdf`
const DOCX = `${HERE}Alex Rivera Resume.docx`
const LINK = 'github.com/robin-example/shelf'
const BACKEND = 'F:/worktrees/cover-me/t3-c59daae8-f7aff07b29605f3f/backend'
const env = Object.fromEntries(execFileSync(process.execPath, [`${BACKEND}/node_modules/supabase/dist/supabase.js`, 'status', '-o', 'env'], { cwd: BACKEND, encoding: 'utf8' })
  .split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/)).filter(Boolean).map((m) => [m[1], m[2]]))
const API = env.API_URL
const ANON = env.PUBLISHABLE_KEY || env.ANON_KEY
const SERVICE = env.SECRET_KEY || env.SERVICE_ROLE_KEY
const MOCK = 'http://127.0.0.1:55990'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

const sum = (r) => r && { filename: r.filename, len: r.text?.length, head: r.text?.slice(0, 30), updatedAt: r.updatedAt ?? r.updated_at, rv: r.readerVersion ?? r.reader_version, file: r.file?.type, design: r.design?.status ?? r.design_hash?.slice(0, 6), mark: !!r.rereadFrom }
const results = []
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail === undefined ? '' : `  ${JSON.stringify(detail)}`}`)
}
const waitFor = async (fn, ms = 30000) => { for (const end = Date.now() + ms; Date.now() < end; await sleep(300)) { const v = await fn(); if (v) return v } return null }

await fetch(`${MOCK}/__mock/reset`, { method: 'POST' })
const email = `compat-${randomUUID().slice(0, 8)}@example.com`
const password = 'password123'
const created = await (await fetch(`${API}/auth/v1/admin/users`, { method: 'POST', headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, email_confirm: true }) })).json()
const sql = (q) => execFileSync('docker', ['exec', 'supabase_db_cover-me-401', 'psql', '-U', 'postgres', '-tAc', q], { encoding: 'utf8' }).trim()
for (let i = 0; i < 20 && !sql(`select id from public.users where id = '${created.id}'`); i++) await sleep(250)
sql(`update public.users set tier = 'hosted_pro' where id = '${created.id}'`)
const fresh = async () => (await (await fetch(`${API}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })).json()).access_token
const resumeFn = async (method, body) => (await fetch(`${API}/functions/v1/resume`, { method, headers: { Authorization: `Bearer ${await fresh()}`, 'Content-Type': 'application/json', 'X-Resume-Fields': '2' }, ...(body ? { body: JSON.stringify(body) } : {}) })).json()
const account = () => resumeFn('GET')
const resetLimit = () => sql('delete from public.scrape_rate_limits')

async function launch(name, dist) {
  const ext = `${HERE}ext-${name}`
  const prof = `${HERE}profile-${name}`
  rmSync(ext, { recursive: true, force: true })
  rmSync(prof, { recursive: true, force: true })
  cpSync(dist, ext, { recursive: true })
  const ctx = await chromium.launchPersistentContext(prof, {
    channel: 'chromium', headless: false, viewport: { width: 380, height: 640 }, acceptDownloads: true,
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'],
  })
  const sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker')
  const id = new URL(sw.url()).host
  const page = ctx.pages()[0] ?? await ctx.newPage()
  await page.goto(`chrome-extension://${id}/src/popup/index.html`)
  await sleep(1500)
  for (const p of ctx.pages()) if (p.url().includes('/src/welcome/')) await p.close()
  await page.evaluate(() => chrome.storage.local.set({ settings: { provider: 'claude', apiKey: '', mode: 'hosted' }, pageReadAgreed: false, answersNews: 'seen' }))
  return {
    name, ctx, page, prof, ext,
    local: async (k) => (await page.evaluate((key) => chrome.storage.local.get(key), k))[k],
    set: (obj) => page.evaluate((o) => chrome.storage.local.set(o), obj),
    shot: (n) => page.screenshot({ path: `${OUT}/${name}-${n}.png` }),
    errors: () => page.locator('.error-box').allTextContents(),
    async open(p) {
      await page.evaluate((pg) => chrome.storage.local.set({ activePage: pg }), p)
      await page.reload()
      await sleep(2500)
    },
  }
}

async function signIn(b) {
  await b.open('settings')
  const toSignIn = b.page.getByRole('button', { name: 'Sign in →' })
  if (await toSignIn.count()) await toSignIn.click()
  await b.page.locator('input[type=email]').fill(email)
  await b.page.locator('input[type=password]').fill(password)
  await b.page.getByRole('button', { name: 'Sign In', exact: true }).click()
  for (let i = 0; i < 40 && !(await b.local('session')); i++) await sleep(250)
  await sleep(2500)
}
async function signOut(b) {
  await b.open('settings')
  await b.page.getByRole('button', { name: 'Sign out' }).click()
  for (let i = 0; i < 40 && (await b.local('session')); i++) await sleep(250)
}
async function signInAgain(b) {
  await b.page.evaluate(() => chrome.storage.local.remove('session'))
  await signIn(b)
}
async function upload(b, file) {
  await b.open('resume')
  const before = (await b.local('resume'))?.updatedAt
  await b.page.locator('input[type=file]').setInputFiles(file)
  await waitFor(async () => { const r = await b.local('resume'); return r?.text && r.updatedAt !== before && r.accountId })
  await sleep(2500)
}
async function fillJob(b) {
  await b.page.getByRole('button', { name: /Paste it manually/ }).click().catch(() => {})
  await sleep(500)
  await b.page.getByPlaceholder('e.g. Senior Software Engineer').fill('Data Analyst')
  await b.page.getByPlaceholder('e.g. Acme Corp (optional)').fill('Acme Example')
  await b.page.getByPlaceholder('Paste the full job description here…').fill('Acme Example is hiring a data analyst. You will build dashboards in SQL and Tableau, own weekly reporting, and work with product managers. 3 years of SQL required. Python is a plus.')
}

// ---- The store build alone ----
const X = await launch('x-old', oldDist)
await signIn(X)
check('old: signed in', (await X.local('session'))?.user?.email === email)

await upload(X, PDF)
let local = await X.local('resume')
let acct = await account()
await X.shot('1-upload')
check('old: PDF upload saved to the account', acct.text === local.text && acct.filename === 'Robin Example Resume.pdf', { reader_version: acct.reader_version, uploaded_at: acct.uploaded_at })
check('old: no error on the Resume tab', (await X.errors()).length === 0, await X.errors())

await signOut(X)
await signIn(X)
const resynced = await X.local('resume')
acct = await account()
check('old: sign-in sync of the same text keeps it on both sides', resynced.text === local.text && acct.text === local.text, { before: sum(local), after: sum(resynced), acct: sum(acct), session: !!(await X.local('session')) })

resetLimit()
await upload(X, DOCX)
const design = await waitFor(async () => { const r = await X.local('resume'); return r.design?.status && r.design.status !== 'checking' && r.design })
await X.shot('2-word')
check('old: Word upload design check finished', design?.status === 'done', { status: design?.status, error: design?.error })
check('old: Pro Word file reached the account', Number(await waitFor(async () => Number(sql(`select count(*) from public.resume_files where user_id = '${created.id}'`)) > 0 && 1)) === 1)

resetLimit()
await X.open('generate')
await fillJob(X)
await X.page.getByRole('button', { name: 'Generate Cover Letter' }).click()
const letters = await waitFor(async () => { const h = await X.local('history'); return h?.length && h }, 60000)
await X.shot('3-letter')
check('old: cover letter generated and saved', !!letters?.[0]?.content || !!letters?.[0]?.letter || !!letters?.length, letters && Object.keys(letters[0]))
await X.page.evaluate(() => chrome.storage.local.remove(['generatePage', 'tailorJob', 'coverJob']))
await X.open('generate')
await fillJob(X)
resetLimit()
await X.page.getByRole('button', { name: 'Tailor Resume to Job' }).first().click()
const tj = await waitFor(async () => { const j = await X.local('tailorJob'); return j && j.status !== 'loading' && j }, 90000)
await X.shot('4-tailored')
check('old: resume tailored', tj?.status === 'done', { status: tj?.status, error: tj?.error })
const tailored = await X.local('tailoredHistory')
check('old: tailored resume saved', tailored?.length === 1)

const apps = await (await fetch(`${API}/functions/v1/applications`, { headers: { Authorization: `Bearer ${await fresh()}`, 'X-Resume-Fields': '2' } })).json()
writeFileSync(`${OUT}/applications.json`, JSON.stringify(apps, null, 2))
const serverSource = JSON.stringify(apps).match(/"source":\{[^}]*\}/)?.[0] ?? null
check(`old: account's tailored copy source (${label})`, true, serverSource)

await X.open('history')
const view = X.page.getByRole('button', { name: 'View' }).first()
if (await view.count()) await view.click()
await sleep(1500)
await X.shot('5-history')
const body = await X.page.locator('body').innerText()
check('old: Pro History shows the job with its letter and tailored resume', body.includes('Data Analyst') && body.includes('Cover Letter') && body.includes('Tailored Resume'))
check('old: no error in History', (await X.errors()).length === 0, await X.errors())

// The applications list the old build's Pro History reads.
const tid = tailored[0].id
const saved = await X.page.evaluate(async ({ api, id }) => {
  const { session } = await chrome.storage.local.get('session')
  const res = await fetch(`${api}/functions/v1/applications`, { headers: { Authorization: `Bearer ${session.access_token}`, 'X-Resume-Fields': '2' } })
  return { status: res.status, id }
}, { api: API, id: tid })
check('old: applications list loads for the old build', saved.status === 200, saved)

// ---- One account, old and new builds ----
if (newDist) {
  const Y = await launch('y-new', newDist)
  await signIn(Y)
  let y = await Y.local('resume')
  acct = await account()
  await Y.open('resume')
  await Y.shot('m1-signin')
  check('mixed: new build takes the old build\'s Word upload', y?.text === acct.text && y.filename === 'Alex Rivera Resume.docx', { y: sum(y), acct: sum(acct) })
  y = await waitFor(async () => { const r = await Y.local('resume'); return r.readerVersion === 2 && !r.rereadFrom && r })
  acct = await account()
  check('mixed: new build restored the Word file from the account, re-read it, and the account has reader_version 2', y?.file?.type === 'docx' && acct.text === y.text && acct.reader_version === 2, { y: sum(y ?? await Y.local('resume')), acct: sum(acct) })

  resetLimit()
  await upload(Y, PDF)
  y = await Y.local('resume')
  acct = await account()
  check('mixed: new build upload reaches the account with reader_version 2', acct.text === y.text && acct.reader_version === 2, { y: sum(y), acct: sum(acct) })
  await signInAgain(X)
  check('mixed: old build signing in takes the new build\'s upload', (await X.local('resume')).text === y.text, { x: sum(await X.local('resume')), y: sum(y) })

  // An older reader's text on Y and the account; X signs in and takes it.
  const fullText = y.text
  const oldText = fullText.replaceAll(LINK, '').replace(/\(\s*\)/g, '')
  await Y.set({ resume: { ...y, text: oldText, readerVersion: 1, parsed: undefined } })
  await resumeFn('POST', { text: oldText, filename: y.filename, readerVersion: 1, uploadedAt: y.uploadedAt })
  await sleep(3000)
  resetLimit()
  await signInAgain(X)
  check('mixed: old build has the older text before the re-read', (await X.local('resume')).text === oldText, { x: sum(await X.local('resume')), acct: sum(await account()) })
  await Y.open('resume')
  await waitFor(async () => { const r = await Y.local('resume'); return r.readerVersion === 2 && !r.rereadFrom && r })
  acct = await account()
  check('mixed: new build re-read reached the account', acct.text === fullText && acct.reader_version === 2, { y: sum(await Y.local('resume')), acct: sum(acct) })
  await signInAgain(X)
  acct = await account()
  check('mixed: old build signing in takes the re-read, not its older text', (await X.local('resume')).text === fullText && acct.text === fullText, { x: sum(await X.local('resume')), acct: sum(acct) })

  resetLimit()
  await upload(X, PDF_B)
  const xText = (await X.local('resume')).text
  acct = await account()
  check('mixed: old build upload reaches the account', acct.text === xText && acct.reader_version === null)
  await Y.open('resume')
  await waitFor(async () => (await Y.local('resume')).text === xText)
  y = await Y.local('resume')
  await Y.shot('m2-old-upload')
  check('mixed: new build takes it, with no Download for a file it doesn\'t have', y.text === xText && y.filename === 'Sam Other Resume.pdf' && !y.file && await Y.page.locator('.resume-download').count() === 0, { y: sum(y) })
  check('mixed: new build shows the one-time re-upload note for the old build\'s PDF', await Y.page.getByText('Re-upload your resume').count() > 0)
  await Y.ctx.close()
  rmSync(Y.prof, { recursive: true, force: true })
  rmSync(Y.ext, { recursive: true, force: true })
}

writeFileSync(`${OUT}/results.json`, JSON.stringify({ label, results }, null, 2))
await X.ctx.close()
rmSync(X.prof, { recursive: true, force: true })
rmSync(X.ext, { recursive: true, force: true })
await fetch(`${API}/auth/v1/admin/users/${created.id}`, { method: 'DELETE', headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } })
const failed = results.filter((r) => !r.ok)
console.log(`\n${label}: ${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
