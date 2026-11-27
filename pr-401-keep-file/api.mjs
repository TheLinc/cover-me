// node api.mjs <label>: the resume function's answers on the private stack, for
// whichever version `supabase functions serve` is running. Prints a transcript.
import { createHash, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const BACKEND = 'F:/worktrees/cover-me/t3-c59daae8-f7aff07b29605f3f/backend'
const env = Object.fromEntries(execFileSync(process.execPath, [`${BACKEND}/node_modules/supabase/dist/supabase.js`, 'status', '-o', 'env'], { cwd: BACKEND, encoding: 'utf8' })
  .split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/)).filter(Boolean).map((m) => [m[1], m[2]]))
const API = env.API_URL
const SERVICE = env.SECRET_KEY || env.SERVICE_ROLE_KEY
const ANON = env.PUBLISHABLE_KEY || env.ANON_KEY
const sha = (s) => createHash('sha256').update(s).digest('hex')

const email = `proof-${randomUUID()}@cover-me.test`
const created = await (await fetch(`${API}/auth/v1/admin/users`, { method: 'POST', headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'password123', email_confirm: true }) })).json()
const { access_token: token } = await (await fetch(`${API}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'password123' }) })).json()

const call = async (method, body) => {
  const res = await fetch(`${API}/functions/v1/resume`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })
  return { status: res.status, body: await res.json().catch(() => null) }
}
const show = (r) => {
  const { text, filename, reader_version, uploaded_at, error, success } = r.body ?? {}
  return JSON.stringify({ status: r.status, ...(text ? { text } : {}), ...(filename ? { filename } : {}), ...(r.body && 'reader_version' in r.body ? { reader_version } : {}), ...(r.body && 'uploaded_at' in r.body ? { uploaded_at } : {}), ...(error ? { error } : {}), ...(success ? { success } : {}) })
}

const A = 'Robin Example\nShelf: a reading list app'
const B = 'Robin Example\nShelf (github.com/robin-example/shelf): a reading list app'
const C = 'Robin Example\nUploaded on another computer'
const lines = [`# resume function, ${process.argv[2]}`]
const step = async (label, method, body) => { const r = await call(method, body); lines.push(`${label}\n  ${method} ${body ? JSON.stringify(body) : ''}\n  -> ${show(r)}`) }

await step('1. Upload, reader 1', 'POST', { text: A, filename: 'Robin Example Resume.pdf', readerVersion: 1, uploadedAt: '2026-11-20T15:00:00.000Z' })
await step('2. Read it back', 'GET')
await step('3. Re-read under reader 2, from the text the account has', 'POST', { text: B, filename: 'Robin Example Resume.pdf', readerVersion: 2, reread: true, baseTextHash: sha(A) })
await step('4. Read it back', 'GET')
await step('5. Another computer uploads new text', 'POST', { text: C, filename: 'Other.pdf' })
await step('6. A stale re-read from the first computer (base text A)', 'POST', { text: B, filename: 'Robin Example Resume.pdf', readerVersion: 2, reread: true, baseTextHash: sha(A) })
await step('7. Read it back', 'GET')

await fetch(`${API}/auth/v1/admin/users/${created.id}`, { method: 'DELETE', headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } })
console.log(lines.join('\n'))
