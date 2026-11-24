// node proof.mjs <before|after> <backend dir>
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import assert from 'node:assert/strict'

const [mode, backend] = process.argv.slice(2)
const require = createRequire(join(backend, 'package.json'))
const { createClient } = require('@supabase/supabase-js')

const API = 'http://127.0.0.1:55321'
const status = JSON.parse(execFileSync(process.execPath, [join(backend, 'node_modules/supabase/dist/supabase.js'), '--workdir', backend, 'status', '-o', 'json'], { encoding: 'utf8' }).replace(/^[^{]*/, '').replace(/}[^}]*$/, '}'))
const admin = createClient(API, status.SECRET_KEY, { auth: { persistSession: false } })
const psql = (sql) => execFileSync('docker', ['exec', 'supabase_db_cover-me-lock', 'psql', '-U', 'postgres', '-At', '-c', sql], { encoding: 'utf8' }).trim()
const out = []
const log = (title, body) => { out.push(`### ${title}\n${typeof body === 'string' ? body : JSON.stringify(body, null, 2)}`) }

const tables = `('resumes','cover_letters','job_applications','tailored_resumes')`
const grants = psql(`select table_name || ': ' || string_agg(privilege_type, ', ' order by privilege_type) from information_schema.role_table_grants where grantee = 'authenticated' and table_schema = 'public' and table_name in ${tables} group by table_name order by table_name`)
log('1. Table privileges held by authenticated', grants || '(none)')

const fks = psql(`select conrelid::regclass || ': ' || pg_get_constraintdef(oid) from pg_constraint where conname in ('cover_letters_job_application_id_fkey','tailored_resumes_job_application_id_fkey') order by 1`)
log('2. Application link constraints', fks)

async function proUser(email) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: 'password123', email_confirm: true })
  if (error) throw error
  await admin.from('users').update({ tier: 'hosted_pro' }).eq('id', data.user.id)
  const c = createClient(API, status.PUBLISHABLE_KEY, { auth: { persistSession: false } })
  const { data: s } = await c.auth.signInWithPassword({ email, password: 'password123' })
  return { id: data.user.id, token: s.session.access_token }
}
const call = async (name, token, { method = 'GET', body, query = '' } = {}) => {
  const res = await fetch(`${API}/functions/v1/${name}${query}`, {
    method, headers: { apikey: status.PUBLISHABLE_KEY, Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: res.status, body: await res.json() }
}

const dana = await proUser('dana.morrow@cover-me.test')
const eli = await proUser('eli.vance@cover-me.test')
const saved = await call('letters', dana.token, { method: 'POST', body: {
  id: '11111111-2222-4333-8444-555555555555',
  job: { title: 'Product Designer', company: 'Northwind Labs', url: 'https://jobs.example.com/northwind/42' },
  letter: 'Dear Northwind Labs team, I would like to apply for the Product Designer role.',
  createdAt: '2026-11-20T10:00:00.000Z',
} })
const cards = await call('applications', dana.token, { query: '?summary=1' })
const history = await call('letters', dana.token)
log('3. Pro user saves a letter, then reads the dashboard cards and the extension history (Edge Functions)', {
  'POST letters': saved,
  'GET applications?summary=1': { status: cards.status, applications: cards.body.applications?.map((a) => ({ company: a.company, title: a.title, coverLetters: a.coverLetters.length })) },
  'GET letters': { status: history.status, letters: history.body.letters?.map((l) => ({ company: l.job.company, title: l.job.title, letter: l.letter })) },
})
assert.equal(saved.status, 200)
assert.equal(cards.status, 200)
assert.equal(history.body.letters.length, 1)

const appId = psql(`select id from public.job_applications where user_id = '${dana.id}'`)
const crossed = await admin.from('cover_letters').insert({ user_id: eli.id, job_application_id: appId, letter_encrypted: 'x' })
log("4. Service role saves a letter for one user under another user's application", crossed.error ? { error: crossed.error.code, message: crossed.error.message } : { status: crossed.status, inserted: true })

if (mode === 'before') {
  assert.match(grants, /cover_letters: .*INSERT/)
  assert.equal(crossed.error, null)
} else {
  assert.equal(grants, '')
  assert.match(fks, /\(job_application_id, user_id\) REFERENCES job_applications\(id, user_id\)/)
  assert.equal(crossed.error?.code, '23503')
}
console.log(`## ${mode}\n\n` + out.join('\n\n'))
