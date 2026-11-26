// Dashboard proof for #119. Run: npx tsx scratch/dashboard-proof.ts <before|after> <outDir> (web dev on :3100, functions served)
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { chromium } from 'playwright'

const [side, out] = process.argv.slice(2) as ['before' | 'after', string]
const after = side === 'after'
const status = Object.fromEntries(execFileSync('npx', ['supabase', 'status', '-o', 'env'], { cwd: '../backend', encoding: 'utf8', shell: true })
  .split('\n').map((l) => /^(\w+)="?(.*?)"?$/.exec(l.trim())).filter(Boolean).map((m) => [m![1], m![2]]))
const API = status.API_URL
const SERVICE = status.SERVICE_ROLE_KEY
const svc = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' }

const email = `proof-119-${side}-${Date.now()}@example.com`
const password = 'proof-password-119'
const created = await (await fetch(`${API}/auth/v1/admin/users`, { method: 'POST', headers: svc, body: JSON.stringify({ email, password, email_confirm: true }) })).json() as { id: string }
const userId = created.id
await fetch(`${API}/rest/v1/users?id=eq.${userId}`, { method: 'PATCH', headers: svc, body: JSON.stringify({ tier: 'hosted_pro' }) })
const signedIn = await (await fetch(`${API}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: status.ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })).json() as { access_token: string }
const token = signedIn.access_token

const base = { name: 'Jordan Reyes', phone: '(555) 014-2290', email: 'jordan.reyes@example.com', website: '', location: 'Halifax, NS',
  summary: 'Backend engineer with eight years building payment and logistics services.',
  experience: [{ title: 'Senior Backend Engineer', company: 'Harbourline Freight', location: 'Halifax, NS', dates: 'Mar 2021 – Present', bullets: ['Built a Kafka shipment pipeline handling 4M events a day.'] }],
  education: [{ institution: 'Dalhousie University', degree: 'BSc, Computer Science', location: 'Halifax, NS', dates: '2013 – 2017', bullets: [] }],
  skills: 'Go, Python, Kafka, PostgreSQL' }
const tailored = [
  { id: randomUUID(), job: { title: 'Senior Backend Engineer', company: 'Northwind Logistics', url: 'https://jobs.example/northwind/42' }, resume: { ...base, template: 'modern' }, createdAt: '2026-11-21T15:00:00.000Z' },
  { id: randomUUID(), job: { title: 'Platform Engineer', company: 'Bluefin Labs', url: 'https://jobs.example/bluefin/7' }, resume: base, createdAt: '2026-11-20T15:00:00.000Z' },
]
const res = await fetch(`${API}/functions/v1/applications`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Resume-Fields': '2' }, body: JSON.stringify({ letters: [], tailored }) })
if (!res.ok) throw new Error(`seed failed ${res.status} ${await res.text()}`)

const fails: string[] = []
const check = (ok: boolean, what: string) => { console.log(`${ok ? 'PASS' : 'FAIL'} [${side}] ${what}`); if (!ok) fails.push(what) }

const browser = await chromium.launch({ channel: 'chromium' })
const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, acceptDownloads: true })
try {
  await page.goto('http://localhost:3100/auth?mode=signin')
  await page.getByPlaceholder('you@example.com').last().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  await page.locator('form button[type="submit"]').last().click()
  await page.waitForURL(/\/dashboard/, { timeout: 60_000 })
  await page.goto('http://localhost:3100/dashboard/applications')
  for (const [title, company, expected] of [['Senior Backend Engineer', 'Northwind Logistics', after ? 'sans-serif' : 'serif'], ['Platform Engineer', 'Bluefin Labs', 'serif']] as const) {
    await page.getByRole('button', { name: title, exact: true }).first().click({ timeout: 60_000 })
    const sheet = page.getByRole('dialog')
    const button = sheet.getByRole('button', { name: 'Download PDF' })
    await button.waitFor({ timeout: 60_000 })
    if (company === 'Northwind Logistics') await page.screenshot({ path: `${out}/${side}-7-dashboard.png` })
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 60_000 }), button.click()])
    const bytes = await readFile((await download.path())!)
    await writeFile(`${out}/${side}-dashboard-${company.split(' ')[0].toLowerCase()}.pdf`, bytes)
    const pdf = await getDocument({ data: new Uint8Array(bytes), verbosity: 0 }).promise
    const { items, styles } = await (await pdf.getPage(1)).getTextContent()
    const name = items.find((i) => 'str' in i && i.str === 'Jordan Reyes') as { fontName: string }
    const family = styles[name.fontName].fontFamily
    check(family === expected, `dashboard download for ${company} (${company === 'Northwind Logistics' ? 'saved as Modern' : 'made before templates'}) is ${family}`)
    await page.keyboard.press('Escape')
    await sheet.waitFor({ state: 'hidden' })
  }
} finally {
  await browser.close()
  await fetch(`${API}/auth/v1/admin/users/${userId}`, { method: 'DELETE', headers: svc })
}
await writeFile(`${out}/${side}-dashboard-result.txt`, fails.length ? `FAILED:\n${fails.join('\n')}\n` : 'all checks passed\n')
process.exit(fails.length ? 1 : 0)
