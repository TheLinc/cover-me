// node e2e.mjs <extension dist>
// Signed-in (hosted, Pro) end-to-end run of #401 against the private stack and the mock model.
// Two Chromium profiles, A and B, are two computers signed into the same account.
import { createRequire } from 'node:module'
import { createHash, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const require = createRequire('F:/worktrees/cover-me/t3-c59daae8-f7aff07b29605f3f/extension/package.json')
const { chromium } = require('playwright')

const [dist] = process.argv.slice(2)
const HERE = new URL('.', import.meta.url).pathname.replace(/^\/(\w:)/, '$1')
const EXT = `${HERE}ext`
const OUT = `${HERE}out`
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
const sha = (s) => createHash('sha256').update(s).digest('hex')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync(OUT, { recursive: true })
rmSync(EXT, { recursive: true, force: true })
cpSync(dist, EXT, { recursive: true })

const results = []
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail === undefined ? '' : `  ${JSON.stringify(detail)}`}`)
}

// --- account ---
const email = `e2e-${randomUUID().slice(0, 8)}@example.com`
const password = 'password123'
const created = await (await fetch(`${API}/auth/v1/admin/users`, { method: 'POST', headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, email_confirm: true }) })).json()
const sql = (q) => execFileSync('docker', ['exec', 'supabase_db_cover-me-401', 'psql', '-U', 'postgres', '-tAc', q], { encoding: 'utf8' }).trim()
// The users row is made by a trigger; Pro so the tailor saves its copy to the account.
for (let i = 0; i < 20 && !sql(`select id from public.users where id = '${created.id}'`); i++) await sleep(250)
sql(`update public.users set tier = 'hosted_pro' where id = '${created.id}'`)
const { access_token: token } = await (await fetch(`${API}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })).json()
const resumeFn = async (method, body) => {
  const res = await fetch(`${API}/functions/v1/resume`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Resume-Fields': '2' }, ...(body ? { body: JSON.stringify(body) } : {}) })
  return res.json()
}
const account = () => resumeFn('GET')
const uploads = async () => (await (await fetch(`${MOCK}/__mock/posthog`)).json()).filter((e) => e.event === 'resume_upload').length
const promptOf = (r) => { const c = r.messages?.[0]?.content; return typeof c === 'string' ? c : (c ?? []).map((b) => b.text ?? '').join('') }
const parsesOf = async (text) => (await (await fetch(`${MOCK}/__mock/requests`)).json()).filter((r) => r.model?.includes('haiku') && !r.stream && promptOf(r).includes(text)).length

// --- browsers ---
async function launch(name) {
  const prof = `${HERE}profile-${name}`
  rmSync(prof, { recursive: true, force: true })
  const ctx = await chromium.launchPersistentContext(prof, {
    channel: 'chromium', headless: false, viewport: { width: 380, height: 640 }, acceptDownloads: true,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'],
  })
  const sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker')
  const id = new URL(sw.url()).host
  const page = ctx.pages()[0] ?? await ctx.newPage()
  await page.goto(`chrome-extension://${id}/src/popup/index.html`)
  await sleep(1500)
  for (const p of ctx.pages()) if (p.url().includes('/src/welcome/')) await p.close()
  await page.evaluate(() => chrome.storage.local.set({ settings: { provider: 'claude', apiKey: '', mode: 'hosted' }, pageReadAgreed: false, answersNews: 'seen' }))
  const b = {
    name, ctx, page, prof, sw,
    local: async (k) => (await page.evaluate((key) => chrome.storage.local.get(key), k))[k],
    set: (obj) => page.evaluate((o) => chrome.storage.local.set(o), obj),
    files: async () => Object.keys(await page.evaluate(() => chrome.storage.local.get(null))).filter((k) => k.startsWith('designFile:')),
    shot: (n) => page.screenshot({ path: `${OUT}/${name}-${n}.png` }),
    async open(p) {
      await page.evaluate((pg) => chrome.storage.local.set({ activePage: pg }), p)
      await page.reload()
      await sleep(2500)
    },
  }
  return b
}

async function signIn(b) {
  await b.open('settings')
  const toSignIn = b.page.getByRole('button', { name: 'Sign in →' })
  if (await toSignIn.count()) await toSignIn.click()
  await b.page.locator('input[type=email]').fill(email)
  await b.page.locator('input[type=password]').fill(password)
  await b.page.getByRole('button', { name: 'Sign In', exact: true }).click()
  for (let i = 0; i < 40 && !(await b.local('session')); i++) await sleep(250)
  await sleep(1500)
}

async function upload(b, file) {
  await b.open('resume')
  const before = (await b.local('resume'))?.updatedAt
  await b.page.locator('input[type=file]').setInputFiles(file)
  for (let i = 0; i < 80; i++) {
    const r = await b.local('resume')
    if (r?.text && r.updatedAt !== before && r.accountId) break
    await sleep(250)
  }
  await sleep(2500)
}

const waitFor = async (fn, ms = 30000) => { for (const end = Date.now() + ms; Date.now() < end; await sleep(300)) { const v = await fn(); if (v) return v } return null }

// Puts this computer and the account back where an older reader left them:
// the text with the link gone, readerVersion 1 on both.
async function makeOld(b, edit) {
  const r = await b.local('resume')
  const oldText = edit(r.text)
  await b.set({ resume: { ...r, text: oldText, readerVersion: 1, parsed: undefined } })
  await resumeFn('POST', { text: oldText, filename: r.filename, readerVersion: 1, uploadedAt: r.uploadedAt })
  await sleep(3000)
  sql('delete from public.scrape_rate_limits')
  return oldText
}
const dropLink = (t) => t.replaceAll(LINK, '').replace(/\(\s*\)/g, '')

await fetch(`${MOCK}/__mock/reset`, { method: 'POST' })
const A = await launch('a')
await signIn(A)
check('A signed in through the popup', (await A.local('session'))?.user?.email === email)

// 1. Signed-in PDF upload reaches the account with its reader version and upload date.
let u0 = await uploads()
await upload(A, PDF)
let local = await A.local('resume')
let acct = await account()
await A.shot('1-upload')
check('1. PDF stored on this computer', local.file?.type === 'pdf' && (await A.files()).includes(`designFile:${local.file.id}`), local.file)
check('1. account has the text, reader_version 2 and the upload date', acct.text === local.text && acct.reader_version === 2 && acct.uploaded_at && Date.parse(acct.uploaded_at) === Date.parse(local.uploadedAt), { reader_version: acct.reader_version, uploaded_at: acct.uploaded_at, local: local.uploadedAt })
check('1. upload counted once (positive control)', (await uploads()) === u0 + 1, { before: u0, after: await uploads() })

// 2. Re-read on popup open while signed in: the account gets the new text, keeps its upload date,
// and the re-read is not counted as an upload or parsed ahead.
const uploadedAt = local.uploadedAt
const fullText = local.text
const oldA = await makeOld(A, dropLink)
u0 = await uploads()
const p0 = await parsesOf(fullText)
await A.open('resume')
const reread = await waitFor(async () => { const r = await A.local('resume'); return r.readerVersion === 2 && !r.rereadFrom && r })
await sleep(5000)
acct = await account()
await A.shot('2-reread')
check('2. this computer re-read the file (link back, reader 2, mark cleared)', reread && reread.text.includes(LINK) && !oldA.includes(LINK), { readerVersion: reread?.readerVersion, mark: reread?.rereadFrom })
check('2. account has the re-read text and reader_version 2', acct.text === reread?.text && acct.reader_version === 2, { reader_version: acct.reader_version, hasLink: acct.text?.includes(LINK) })
check('2. account kept the original upload date', Date.parse(acct.uploaded_at) === Date.parse(uploadedAt), { account: acct.uploaded_at, original: uploadedAt })
check('2. re-read not counted as an upload', (await uploads()) === u0, { before: u0, after: await uploads() })
check('2. re-read started no server parse of its text', reread?.text === fullText && (await parsesOf(fullText)) === p0, { before: p0, after: await parsesOf(fullText) })

// 3. Another computer uploads while A's re-read is waiting: the account's newer copy wins.
const oldA2 = await makeOld(A, dropLink)
await A.ctx.setOffline(true)
await A.open('resume')
const pending = await waitFor(async () => { const r = await A.local('resume'); return r.readerVersion === 2 && r.rereadFrom && r }, 15000)
check('3. offline, A re-read and kept it marked as waiting for the account', pending && pending.rereadFrom === sha(oldA2), { mark: pending?.rereadFrom })
const B = await launch('b')
await signIn(B)
await upload(B, PDF_B)
const bText = (await B.local('resume')).text
acct = await account()
check('3. B uploaded a different resume to the account', acct.filename === 'Sam Other Resume.pdf' && acct.text === bText)
u0 = await uploads()
await A.ctx.setOffline(false)
await A.open('resume')
const settled = await waitFor(async () => { const r = await A.local('resume'); return !r.rereadFrom && r.text === bText && r })
acct = await account()
await A.shot('3-account-wins')
check('3. A took B\'s resume and dropped its waiting re-read', !!settled && settled.filename === 'Sam Other Resume.pdf', { filename: (await A.local('resume')).filename, mark: (await A.local('resume')).rereadFrom })
check('3. account still has B\'s resume', acct.text === bText && acct.filename === 'Sam Other Resume.pdf')
check('3. A\'s Resume tab names B\'s file', await A.page.getByText('Sam Other Resume.pdf').count() > 0)
check('3. the refused re-read was not counted as an upload', (await uploads()) === u0)

// 4. Word file: upload, design check, then a re-read whose check runs in the worker.
await upload(A, DOCX)
let design = await waitFor(async () => { const r = await A.local('resume'); return r.design?.status && r.design.status !== 'checking' && r.design })
local = await A.local('resume')
check('4. Word upload: design check finished', design?.status === 'done', design)
check('4. Word file stored and named as the resume file', local.file?.type === 'docx' && local.design?.hash === local.file.id && (await A.files()).includes(`designFile:${local.file.id}`))
const filesRow = () => sql(`select count(*) from public.resume_files where user_id = '${created.id}'`)
check('4. Pro: the Word file reached the account', Number(await waitFor(async () => Number(filesRow()) > 0 && filesRow())) > 0)
const docxLines = local.text.split('\n').filter((l) => l.trim())
const lastLine = docxLines[docxLines.length - 1]
const oldW = await makeOld(A, (t) => t.replace(lastLine, '').trimEnd())
u0 = await uploads()
await A.open('resume')
const wordReread = await waitFor(async () => { const r = await A.local('resume'); return r.readerVersion === 2 && !r.rereadFrom && r.design?.status === 'done' && r }, 45000)
acct = await account()
local = await A.local('resume')
await A.shot('4-word-reread')
check('4. Word re-read: text back, mark cleared, design check done', !!wordReread && wordReread.text.includes(lastLine) && !oldW.includes(lastLine), { status: local.design?.status, error: local.design?.error, mark: local.rereadFrom })
check('4. account has the Word re-read and reader_version 2', acct.text === local.text && acct.reader_version === 2, { reader_version: acct.reader_version })
check('4. Word re-read not counted as an upload', (await uploads()) === u0, { before: u0, after: await uploads() })

// 5. A real letter and tailor run, then History names the source and downloads it.
await A.open('generate')
const using = A.page.locator('.using-line')
await A.page.getByRole('button', { name: /Paste it manually/ }).click().catch(() => {})
await sleep(500)
const usingText = await using.first().textContent().catch(() => null)
check('5. Generate says which resume it uses', usingText?.startsWith('Using Alex Rivera Resume.docx, uploaded '), usingText)
await A.page.getByPlaceholder('e.g. Senior Software Engineer').fill('Data Analyst')
await A.page.getByPlaceholder('e.g. Acme Corp (optional)').fill('Acme Example')
await A.page.getByPlaceholder('Paste the full job description here…').fill('Acme Example is hiring a data analyst. You will build dashboards in SQL and Tableau, own weekly reporting, and work with product managers. 3 years of SQL required. Python is a plus.')
await A.page.getByRole('button', { name: 'Generate Cover Letter' }).click()
const letters = await waitFor(async () => { const h = await A.local('history'); return h?.length && h }, 60000)
await A.shot('5-letter')
check('5. letter saved here with its source', letters?.[0]?.source?.filename === 'Alex Rivera Resume.docx' && letters[0].source.fileId === local.file.id, letters?.[0]?.source)
await A.page.evaluate(() => chrome.storage.local.remove(['generatePage', 'tailorJob', 'coverJob']))
await A.open('generate')
await A.page.getByRole('button', { name: /Paste it manually/ }).click().catch(() => {})
await sleep(500)
await A.page.getByPlaceholder('e.g. Senior Software Engineer').fill('Data Analyst')
await A.page.getByPlaceholder('e.g. Acme Corp (optional)').fill('Acme Example')
await A.page.getByPlaceholder('Paste the full job description here…').fill('Acme Example is hiring a data analyst. You will build dashboards in SQL and Tableau, own weekly reporting, and work with product managers. 3 years of SQL required. Python is a plus.')
sql('delete from public.scrape_rate_limits')
await A.page.getByRole('button', { name: 'Tailor Resume to Job' }).first().click()
const tailored = await waitFor(async () => { const h = await A.local('tailoredHistory'); return h?.length && h }, 90000)
await A.shot('5-tailored')
check('5. tailored resume saved here with its source', tailored?.[0]?.resume?.source?.filename === 'Alex Rivera Resume.docx' && tailored[0].resume.source.fileId === local.file.id, tailored?.[0]?.resume?.source)
const apps = await (await fetch(`${API}/functions/v1/applications`, { headers: { Authorization: `Bearer ${token}`, 'X-Resume-Fields': '2' } })).json()
writeFileSync(`${OUT}/applications.json`, JSON.stringify(apps, null, 2))
const serverSource = JSON.stringify(apps).match(/"source":\{[^}]*\}/)?.[0]
check('5. Pro: the account\'s tailored copy names its source', serverSource?.includes('Alex Rivera Resume.docx'), serverSource)

await A.open('history')
const view = A.page.getByRole('button', { name: 'View' }).first()
if (await view.count()) await view.click()
await sleep(1500)
await A.shot('5-history')
const fromLines = await A.page.getByText(/^From Alex Rivera Resume\.docx, uploaded /).allTextContents()
check('5. History shows the source on the letter and the tailored resume', fromLines.length >= 2, fromLines)
const dl = A.page.getByRole('button', { name: /^Download Alex Rivera Resume\.docx|^Download$/ })
const dlCount = await dl.count()
let bytesMatch = false
if (dlCount) {
  const [download] = await Promise.all([A.page.waitForEvent('download', { timeout: 10000 }), dl.first().click()])
  const path = `${OUT}/downloaded-${download.suggestedFilename()}`
  await download.saveAs(path)
  bytesMatch = readFileSync(path).equals(readFileSync(DOCX))
  check('5. History Download saves the original Word file', bytesMatch && download.suggestedFilename() === 'Alex Rivera Resume.docx', download.suggestedFilename())
} else check('5. History Download saves the original Word file', false, 'no Download button')

writeFileSync(`${OUT}/results.json`, JSON.stringify({ email, results }, null, 2))
await A.ctx.close()
await B.ctx.close()
rmSync(A.prof, { recursive: true, force: true })
rmSync(B.prof, { recursive: true, force: true })
await fetch(`${API}/auth/v1/admin/users/${created.id}`, { method: 'DELETE', headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } })
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
