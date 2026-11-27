// Existing users updating to the #401 build, every generation route.
//   node upgrade.mjs setup <master dist> [scenario...]   phase 1 on the store code, master functions served
//   node upgrade.mjs run <base|up> <dist> [scenario...]  phase 2 on the given build
//   node upgrade.mjs compare
// Each scenario has two profiles made the same way: "base" stays on master, "up" updates to the branch.
import { createRequire } from 'node:module'
import { createHash, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
const require = createRequire('<repo>/extension/package.json')
const { chromium } = require('playwright')
const JSZip = require('jszip')

const [cmd, ...rest] = process.argv.slice(2)
const HERE = new URL('.', import.meta.url).pathname.replace(/^\/(\w:)/, '$1')
const OUT = `${HERE}out`
mkdirSync(OUT, { recursive: true })
const FILES = { pdf: `${HERE}Robin Example Resume.pdf`, docx: `${HERE}Test Person Resume.docx`, txt: `${HERE}Jordan Sample Resume.txt` }
const BACKEND = '<repo>/backend'
const env = Object.fromEntries(execFileSync(process.execPath, [`${BACKEND}/node_modules/supabase/dist/supabase.js`, 'status', '-o', 'env'], { cwd: BACKEND, encoding: 'utf8' })
  .split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/)).filter(Boolean).map((m) => [m[1], m[2]]))
const API = env.API_URL
const ANON = env.PUBLISHABLE_KEY || env.ANON_KEY
const SERVICE = env.SECRET_KEY || env.SERVICE_ROLE_KEY
const MOCK = 'http://127.0.0.1:55990'
const SHIM = 'http://127.0.0.1:55991'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12)
const sql = (q) => execFileSync('docker', ['exec', 'supabase_db_cover-me-401', 'psql', '-U', 'postgres', '-tAc', q], { encoding: 'utf8' }).trim()
const resetLimit = () => sql('delete from public.scrape_rate_limits')
const waitFor = async (fn, ms = 30000) => { for (const end = Date.now() + ms; Date.now() < end; await sleep(300)) { const v = await fn().catch(() => null); if (v) return v } return null }
const STATE = `${HERE}state.json`
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : {}
const saveState = () => writeFileSync(STATE, JSON.stringify(state, null, 2))

// mode: byok | free | pro. old: what an install from before #339 and #238 left behind.
const SCENARIOS = {
  'byok-pdf': { mode: 'byok', file: 'pdf' },
  'byok-pdf-old': { mode: 'byok', file: 'pdf', old: { reader: true, parse: true } },
  'byok-txt': { mode: 'byok', file: 'txt' },
  'byok-docx': { mode: 'byok', file: 'docx' },
  'free-pdf-old': { mode: 'free', file: 'pdf', old: { reader: true } },
  'pro-pdf': { mode: 'pro', file: 'pdf' },
  'pro-docx-old': { mode: 'pro', file: 'docx', old: { reader: true } },
}

const JOB1 = { title: 'Data Analyst', company: 'Acme Example', description: 'Acme Example is hiring a data analyst. You will build dashboards in SQL and Tableau, own weekly reporting, and work with product managers. 3 years of SQL required. Python is a plus.' }
const JOB2 = { title: 'Reporting Analyst', company: 'Beta Sample', description: 'Beta Sample needs a reporting analyst to own monthly finance reports in SQL and Excel, automate them in Python, and present results to managers. 2 years of SQL required.' }

// Own-key calls go to the shim instead of api.anthropic.com. The same patch on both builds.
function installExt(dist, ext, version) {
  rmSync(ext, { recursive: true, force: true })
  cpSync(dist, ext, { recursive: true })
  const walk = (d) => readdirSync(d).flatMap((f) => statSync(`${d}/${f}`).isDirectory() ? walk(`${d}/${f}`) : [`${d}/${f}`])
  for (const f of walk(ext).filter((f) => f.endsWith('.js'))) {
    const s = readFileSync(f, 'utf8')
    if (s.includes('https://api.anthropic.com')) writeFileSync(f, s.replaceAll('https://api.anthropic.com', SHIM))
  }
  const m = JSON.parse(readFileSync(`${ext}/manifest.json`, 'utf8'))
  m.host_permissions.push(`${SHIM}/*`)
  if (version) m.version = version
  writeFileSync(`${ext}/manifest.json`, JSON.stringify(m, null, 2))
}

async function launch(prof, ext, fresh) {
  const ctx = await chromium.launchPersistentContext(prof, {
    channel: 'chromium', headless: false, viewport: { width: 380, height: 640 }, acceptDownloads: true,
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'],
  })
  const sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker')
  const id = new URL(sw.url()).host
  const page = ctx.pages()[0] ?? await ctx.newPage()
  await page.goto(`chrome-extension://${id}/src/popup/index.html`)
  await sleep(2000)
  for (const p of ctx.pages()) if (p !== page) await p.close()
  if (fresh) await page.evaluate(() => chrome.storage.local.set({ settings: { provider: 'claude', apiKey: '', mode: 'hosted' }, pageReadAgreed: false, answersNews: 'seen' }))
  const b = {
    ctx, page, id,
    local: async (k) => (await page.evaluate((key) => chrome.storage.local.get(key), k))[k],
    set: (obj) => page.evaluate((o) => chrome.storage.local.set(o), obj),
    errors: () => page.locator('.error-box').allTextContents(),
    async open(p) {
      await page.evaluate((pg) => chrome.storage.local.set({ activePage: pg }), p)
      await page.reload()
      await sleep(2500)
    },
  }
  return b
}

async function signIn(b, email, password) {
  await b.open('settings')
  const toSignIn = b.page.getByRole('button', { name: 'Sign in →' })
  if (await toSignIn.count()) await toSignIn.click()
  await b.page.locator('input[type=email]').fill(email)
  await b.page.locator('input[type=password]').fill(password)
  await b.page.getByRole('button', { name: 'Sign In', exact: true }).click()
  await waitFor(() => b.local('session'), 10000)
  await sleep(2500)
}

async function useOwnKey(b) {
  await b.open('settings')
  await b.page.getByRole('button', { name: 'I have an API key →' }).click()
  await b.page.getByPlaceholder('sk-ant-api03-…').fill('sk-ant-api03-mock-key-for-local-run')
  await b.page.getByRole('button', { name: 'Save Settings' }).click()
  await waitFor(async () => (await b.local('settings'))?.mode === 'byok' && (await b.local('settings')).apiKey, 5000)
}

async function upload(b, file) {
  await b.open('resume')
  await b.page.locator('input[type=file]').setInputFiles(file)
  await waitFor(async () => (await b.local('resume'))?.text, 30000)
  await sleep(3000)
  if (file.endsWith('.docx')) await waitFor(async () => { const d = (await b.local('resume'))?.design; return d && d.status !== 'checking' && d }, 60000)
}

async function fillJob(b, job) {
  await b.page.getByRole('button', { name: /Paste it manually/ }).click().catch(() => {})
  await sleep(500)
  await b.page.getByPlaceholder('e.g. Senior Software Engineer').fill(job.title)
  await b.page.getByPlaceholder('e.g. Acme Corp (optional)').fill(job.company)
  await b.page.getByPlaceholder('Paste the full job description here…').fill(job.description)
}

async function freshGenerate(b, job) {
  await b.page.evaluate(() => chrome.storage.local.remove(['generatePage', 'tailorJob', 'coverJob']))
  await b.open('generate')
  await fillJob(b, job)
}

async function letter(b, job) {
  const before = (await b.local('history'))?.length ?? 0
  await freshGenerate(b, job)
  resetLimit()
  await b.page.getByRole('button', { name: 'Generate Cover Letter' }).click()
  const done = await waitFor(async () => { const j = await b.local('coverJob'); return j && j.status !== 'loading' && j }, 90000)
  const history = (await b.local('history')) ?? []
  return { status: done?.status ?? 'timeout', error: done?.error, saved: history.length === before + 1, letter: history.length > before ? history[0].letter : null, source: history[0]?.source ?? null, uiErrors: await b.errors() }
}

async function tailor(b, job) {
  const before = (await b.local('tailoredHistory'))?.length ?? 0
  await freshGenerate(b, job)
  resetLimit()
  await b.page.getByRole('button', { name: 'Tailor Resume to Job' }).first().click()
  const done = await waitFor(async () => { const j = await b.local('tailorJob'); return j && j.status !== 'loading' && j }, 120000)
  const list = (await b.local('tailoredHistory')) ?? []
  const r = list.length > before ? list[0].resume : null
  const { source, ...content } = r ?? {}
  return { status: done?.status ?? 'timeout', error: done?.error, saved: list.length === before + 1, content: r ? sha(JSON.stringify(content)) : null, sourceHash: r?.sourceHash ?? null, designFellBack: r?.designFellBack ?? null, source: source ?? null, uiErrors: await b.errors() }
}

async function answer(b, job) {
  resetLimit()
  const res = await b.page.evaluate((j) => chrome.runtime.sendMessage({ type: 'ANSWER_REWRITE', request: { job: { ...j, url: '' }, question: 'Why do you want to work here?', maxLength: 600, jobSource: 'saved' } }), job)
  return { ok: !!res?.answer, error: res?.error ?? null, answer: res?.answer ? sha(res.answer) : null }
}

const modelCalls = async () => {
  const backend = await (await fetch(`${MOCK}/__mock/requests`)).json()
  const shim = await (await fetch(`${SHIM}/__shim/requests`)).json()
  return { backend: backend.length, shim: shim.map((r) => r.kind), backendParses: backend.filter((r) => r.model?.includes('haiku') && !r.stream).length }
}
const callsSince = (a, b) => ({ backend: b.backend - a.backend, backendParses: b.backendParses - a.backendParses, shim: b.shim.slice(a.shim.length).sort().join(',') })

const sum = (r) => r && { filename: r.filename, text: sha(r.text ?? ''), readerVersion: r.readerVersion ?? null, file: r.file?.type ?? null, design: r.design?.status ?? null, parsed: !!r.parsed, linksKept: r.parsed?.linksKept ?? null, parseVersion: r.parsed?.parseVersion ?? null, mark: !!r.rereadFrom }

async function newAccount(tier) {
  const email = `up-${randomUUID().slice(0, 8)}@example.com`
  const password = 'password123'
  const created = await (await fetch(`${API}/auth/v1/admin/users`, { method: 'POST', headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, email_confirm: true }) })).json()
  await waitFor(async () => sql(`select id from public.users where id = '${created.id}'`), 5000)
  if (tier === 'pro') sql(`update public.users set tier = 'hosted_pro' where id = '${created.id}'`)
  return { email, password, id: created.id }
}
const token = async (a) => (await (await fetch(`${API}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: a.email, password: a.password }) })).json()).access_token
// Read straight from the table: a password sign-in for the function would add a session, which is harmless,
// but the row is what the tailor reads.
const accountRow = (a) => {
  const row = sql(`select coalesce(filename,''), reader_version, uploaded_at, design_hash, length(text_encrypted), updated_at from public.resumes where user_id = '${a.id}'`)
  const [filename, reader_version, uploaded_at, design_hash, len, updated_at] = row.split('|')
  return row ? { filename, reader_version: reader_version || null, uploaded_at: uploaded_at || null, design_hash: design_hash ? design_hash.slice(0, 8) : null, encLen: Number(len), updated_at } : null
}
const accountText = async (a) => (await (await fetch(`${API}/functions/v1/resume`, { headers: { Authorization: `Bearer ${await token(a)}`, 'X-Resume-Fields': '2' } })).json()).text

async function setup(dist, names) {
  for (const name of names) for (const arm of ['base', 'up']) {
    const s = SCENARIOS[name]
    const key = `${name}-${arm}`
    const prof = `${HERE}profile-${key}`
    const ext = `${HERE}ext-${key}`
    rmSync(prof, { recursive: true, force: true })
    installExt(dist, ext)
    await fetch(`${MOCK}/__mock/reset`, { method: 'POST' })
    await fetch(`${SHIM}/__shim/reset`)
    const b = await launch(prof, ext, true)
    const acct = s.mode === 'byok' ? null : await newAccount(s.mode)
    if (acct) await signIn(b, acct.email, acct.password)
    else await useOwnKey(b)
    resetLimit()
    await upload(b, FILES[s.file])
    const l = await letter(b, JOB1)
    const t = await tailor(b, JOB1)
    const a = await answer(b, JOB1)
    let resume = await b.local('resume')
    if (s.old) {
      const next = { ...resume }
      if (s.old.reader) delete next.readerVersion
      if (s.old.parse && next.parsed) { const { linksKept, parseVersion, ...p } = next.parsed; next.parsed = p }
      await b.set({ resume: next })
      resume = next
    }
    // Rows written by master's functions have no reader_version or uploaded_at, as in production before the migration runs.
    if (acct) sql(`update public.resumes set reader_version = null, uploaded_at = null where user_id = '${acct.id}'`)
    const hist = { letters: ((await b.local('history')) ?? []).length, tailored: ((await b.local('tailoredHistory')) ?? []).length, files: Object.keys(await b.page.evaluate(() => chrome.storage.local.get(null))).filter((k) => k.startsWith('designFile:')).length }
    await b.page.screenshot({ path: `${OUT}/${key}-0-setup.png` })
    await b.ctx.close()
    state[key] = { name, arm, prof, ext, acct, setup: { letter: l, tailor: t, answer: a, resume: sum(resume), history: hist, account: acct ? accountRow(acct) : null } }
    saveState()
    const ok = l.saved && t.saved && a.ok
    console.log(`${ok ? 'OK  ' : 'FAIL'} setup ${key}  ${JSON.stringify({ letter: l.status, tailor: t.status, tErr: t.error, design: t.sourceHash ? 'yours' : 'cover-me', fellBack: t.designFellBack, answer: a.ok || a.error, design: resume?.design?.status, hist })}`)
  }
}

async function docxXml(buf) {
  const zip = await JSZip.loadAsync(buf)
  return sha(await zip.file('word/document.xml').async('string'))
}

async function download(b, trigger, item) {
  try {
    const wait = b.page.waitForEvent('download', { timeout: 15000 })
    wait.catch(() => {})
    await trigger.click()
    if (item) { await sleep(300); await b.page.getByRole('menuitem', { name: item }).first().click() }
    const dl = await wait
    const path = `${OUT}/dl-${randomUUID().slice(0, 6)}-${dl.suggestedFilename()}`
    await dl.saveAs(path)
    const buf = readFileSync(path)
    return { ok: true, name: dl.suggestedFilename().replace(/\d{4}-\d{2}-\d{2}/, 'DATE'), bytes: buf.length > 0, docx: dl.suggestedFilename().endsWith('.docx') ? await docxXml(buf) : null }
  } catch (err) {
    await b.page.keyboard.press('Escape').catch(() => {})
    return { ok: false, error: String(err).slice(0, 120) }
  }
}

async function phase2(arm, dist, names) {
  const version = arm === 'up' ? '1.11.0' : '1.10.1'
  for (const name of names) {
    const key = `${name}-${arm}`
    const st = state[key]
    if (!st) { console.log(`skip ${key}: no setup`); continue }
    const s = SCENARIOS[name]
    installExt(dist, st.ext, version)
    rmSync(`${st.prof}/Default/Service Worker`, { recursive: true, force: true })
    await fetch(`${MOCK}/__mock/reset`, { method: 'POST' })
    await fetch(`${SHIM}/__shim/reset`)
    const c0 = await modelCalls()
    const b = await launch(st.prof, st.ext, false)
    const r = { version: await b.page.evaluate(() => chrome.runtime.getManifest().version) }
    // The popup opens on Generate, as it does for a user; give the open-time refresh time to finish.
    await b.open('generate')
    await sleep(6000)
    if (s.file === 'docx') await waitFor(async () => { const d = (await b.local('resume'))?.design; return d && d.status !== 'checking' && d }, 60000)
    r.resumeAfterOpen = sum(await b.local('resume'))
    r.callsOnOpen = callsSince(c0, await modelCalls())
    r.usingLine = await b.page.locator('.using-line').first().textContent({ timeout: 1500 }).catch(() => null)
    r.generateErrors = await b.errors()
    await b.page.screenshot({ path: `${OUT}/${key}-1-generate.png` })

    await b.open('resume')
    r.resumeTab = {
      note: await b.page.getByText('Re-upload your resume').count() > 0,
      errors: await b.errors(),
      filename: await b.page.getByText(st.setup.resume.filename).count() > 0,
      download: await b.page.locator('.resume-download').count() > 0,
    }
    await b.page.screenshot({ path: `${OUT}/${key}-2-resume.png` })

    const c1 = await modelCalls()
    r.letter = await letter(b, JOB2)
    r.callsLetter = callsSince(c1, await modelCalls())
    await b.page.screenshot({ path: `${OUT}/${key}-3-letter.png` })
    const c2 = await modelCalls()
    r.tailor = await tailor(b, JOB2)
    r.callsTailor = callsSince(c2, await modelCalls())
    await b.page.screenshot({ path: `${OUT}/${key}-4-tailor.png` })
    const c3 = await modelCalls()
    r.answer = await answer(b, JOB2)
    r.callsAnswer = callsSince(c3, await modelCalls())

    r.resumeAfter = sum(await b.local('resume'))
    r.history = {
      letters: ((await b.local('history')) ?? []).length,
      tailored: ((await b.local('tailoredHistory')) ?? []).length,
      files: Object.keys(await b.page.evaluate(() => chrome.storage.local.get(null))).filter((k) => k.startsWith('designFile:')).length,
    }
    if (st.acct) {
      r.account = accountRow(st.acct)
      r.accountTextSame = sha(await accountText(st.acct)) === st.setup.resume.text
    }

    // History: the old job's card, its letter PDF and its tailored resume in both formats.
    await b.open('history')
    await sleep(2500)
    const card = b.page.locator('.job-card', { hasText: JOB1.title })
    r.historyView = { oldCard: await card.count() > 0, newCard: await b.page.locator('.job-card', { hasText: JOB2.title }).count() > 0, errors: await b.errors() }
    if (r.historyView.oldCard) {
      await card.first().getByRole('button', { name: 'View' }).click()
      await sleep(1500)
      const body = await card.first().innerText()
      r.historyView.oldHasLetter = body.includes('Cover Letter')
      r.historyView.oldHasTailored = body.includes('Tailored Resume')
      r.historyView.oldFromLine = /From .*, uploaded/.test(body)
      await b.page.screenshot({ path: `${OUT}/${key}-5-history.png`, fullPage: true })
      r.oldLetterPdf = await download(b, card.first().getByRole('button', { name: 'PDF', exact: true }).first(), null)
      const menu = card.first().locator('[aria-haspopup=menu]').first()
      r.oldTailoredPdf = await download(b, menu, /^PDF/)
      r.oldTailoredWord = await download(b, menu, /^Word/)
    }
    r.historyErrorsAfter = await b.errors()
    await b.ctx.close()
    st[arm === 'up' ? 'up' : 'base'] = r
    saveState()
    const ok = r.letter.saved && r.tailor.saved && r.answer.ok && r.historyView.oldCard && r.oldTailoredWord?.ok && r.oldLetterPdf?.ok
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${arm} ${name}  ${JSON.stringify({ v: r.version, letter: r.letter.status, tailor: r.tailor.status, tErr: r.tailor.error, answer: r.answer.ok || r.answer.error, note: r.resumeTab.note, word: r.oldTailoredWord?.ok, calls: [r.callsLetter, r.callsTailor] })}`)
  }
}

// Fields the #401 build is meant to change; everything else must match master.
const EXPECTED = new Set(['version', 'usingLine', 'resumeTab.note', 'resumeTab.download', 'letter.source', 'tailor.source', 'historyView.oldFromLine', 'resumeAfterOpen.readerVersion', 'resumeAfterOpen.file', 'resumeAfter.readerVersion', 'resumeAfter.file', 'resumeAfterOpen.parseVersion', 'resumeAfter.parseVersion', 'account.reader_version', 'account.uploaded_at', 'account.updated_at', 'history.files'])
function flat(o, p = '', out = {}) {
  for (const [k, v] of Object.entries(o ?? {})) {
    const key = p ? `${p}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, key, out)
    else out[key] = JSON.stringify(v)
  }
  return out
}
function compare() {
  const report = []
  for (const name of Object.keys(SCENARIOS)) {
    const base = state[`${name}-base`]?.base
    const up = state[`${name}-up`]?.up
    if (!base || !up) { report.push({ name, missing: true }); continue }
    const fb = flat(base), fu = flat(up)
    const keys = [...new Set([...Object.keys(fb), ...Object.keys(fu)])].sort()
    const diffs = keys.filter((k) => fb[k] !== fu[k]).map((k) => ({ field: k, base: fb[k], up: fu[k], expected: EXPECTED.has(k) || [...EXPECTED].some((e) => k.startsWith(`${e}.`)) }))
    report.push({ name, unexpected: diffs.filter((d) => !d.expected), expected: diffs.filter((d) => d.expected) })
  }
  writeFileSync(`${HERE}compare.json`, JSON.stringify(report, null, 2))
  for (const r of report) {
    if (r.missing) { console.log(`MISSING ${r.name}`); continue }
    console.log(`\n== ${r.name}: ${r.unexpected.length ? `${r.unexpected.length} UNEXPECTED` : 'no unexpected differences'}`)
    for (const d of r.unexpected) console.log(`  UNEXPECTED ${d.field}: base ${d.base} | up ${d.up}`)
    for (const d of r.expected) console.log(`  expected   ${d.field}: base ${d.base} | up ${d.up}`)
  }
}

if (cmd === 'setup') await setup(rest[0], rest.slice(1).length ? rest.slice(1) : Object.keys(SCENARIOS))
else if (cmd === 'run') await phase2(rest[0], rest[1], rest.slice(2).length ? rest.slice(2) : Object.keys(SCENARIOS))
else if (cmd === 'compare') compare()
else console.log('usage: setup <dist> | run <base|up> <dist> | compare')
