import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { MOCK_PORT } from '../global-setup'

// Set by scripts/test-functions.mjs from `supabase status`.
function env(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`${name} is not set. Run function tests with \`pnpm test:functions\`.`)
  return v
}

export const API_URL = env('SUPABASE_API_URL')
const PUBLISHABLE_KEY = env('SUPABASE_PUBLISHABLE_KEY')
const SERVICE_KEY = env('SUPABASE_SERVICE_KEY')

const MOCK_URL = `http://127.0.0.1:${MOCK_PORT}`

export const admin = createClient(API_URL, SERVICE_KEY, { auth: { persistSession: false } })

export interface TestUser {
  id: string
  email: string
  token: string
}

// A fresh confirmed user per test keeps rate-limit counts and history isolated.
export async function createUser(tier: 'hosted_free' | 'hosted_pro' = 'hosted_free'): Promise<TestUser> {
  const email = `test-${randomUUID()}@cover-me.test`
  const password = 'password123'
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`)

  if (tier !== 'hosted_free') {
    const { error: tierError } = await admin.from('users').update({ tier }).eq('id', data.user.id)
    if (tierError) throw new Error(`set tier failed: ${tierError.message}`)
  }

  const client = createClient(API_URL, PUBLISHABLE_KEY, { auth: { persistSession: false } })
  const { data: session, error: signInError } = await client.auth.signInWithPassword({ email, password })
  if (signInError || !session.session) throw new Error(`signIn failed: ${signInError?.message}`)

  return { id: data.user.id, email, token: session.session.access_token }
}

export async function deleteUser(user: TestUser | undefined) {
  if (user) await admin.auth.admin.deleteUser(user.id)
}

interface CallOptions {
  method?: string
  token?: string | null
  body?: unknown
  query?: Record<string, string>
  headers?: Record<string, string>
  // Sent as-is (e.g. a gzipped body); set Content-Type in headers.
  rawBody?: Uint8Array
  signal?: AbortSignal
}

export async function callFunction(name: string, opts: CallOptions = {}): Promise<Response> {
  const url = new URL(`${API_URL}/functions/v1/${name}`)
  for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, v)
  const headers: Record<string, string> = { apikey: PUBLISHABLE_KEY, ...opts.headers }
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  return fetch(url, {
    method: opts.method ?? (opts.body !== undefined || opts.rawBody ? 'POST' : 'GET'),
    headers,
    body: opts.rawBody ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    signal: opts.signal,
  })
}

export async function uploadResume(user: TestUser, text = RESUME_TEXT) {
  const res = await callFunction('resume', { token: user.token, body: { text, filename: 'resume.pdf' } })
  if (res.status !== 200) throw new Error(`resume upload failed: ${res.status} ${await res.text()}`)
}

export async function quotaUsedToday(userId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0]
  const { data } = await admin.from('rate_limits').select('count').eq('user_id', userId).eq('date', today).maybeSingle()
  return data?.count ?? 0
}

// Usage rows for the allowance tests (migration 015): daysAgo 0 is today, UTC.
export async function setUsage(userId: string, rows: Array<{ daysAgo: number; count: number }>) {
  await admin.from('rate_limits').delete().eq('user_id', userId)
  for (const { daysAgo, count } of rows) {
    const date = new Date(Date.now() - daysAgo * 86_400_000).toISOString().split('T')[0]
    const { error } = await admin.from('rate_limits').insert({ user_id: userId, date, count })
    if (error) throw new Error(`set usage failed: ${error.message}`)
  }
}

export async function setQuotaUsedToday(userId: string, count: number) {
  const today = new Date().toISOString().split('T')[0]
  const { error } = await admin.from('rate_limits').upsert({ user_id: userId, date: today, count })
  if (error) throw new Error(`set quota failed: ${error.message}`)
}

// ── Mock Anthropic control ───────────────────────────────────────────────────

export interface ClaudeRequest {
  model: string
  stream?: boolean
  messages: Array<{ role: string; content: string }>
  thinking?: { type: string }
  output_config?: { effort?: string }
  max_tokens?: number
  fallbacks?: unknown
  betaHeader?: string
}

// A Sonnet 5.5 decline: HTTP 200, stop_reason "refusal", no text.
export const REFUSAL_BODY = JSON.stringify({
  id: 'msg_mock', type: 'message', role: 'assistant', model: 'claude-sonnet-5-5',
  content: [], stop_reason: 'refusal', stop_details: { type: 'refusal', category: 'general_harms' },
  usage: { input_tokens: 1, output_tokens: 0 },
})

export const mockClaude = {
  reset: () => fetch(`${MOCK_URL}/__mock/reset`, { method: 'POST' }),
  failNext: (status = 500) =>
    fetch(`${MOCK_URL}/__mock/fail-next`, { method: 'POST', body: JSON.stringify({ status }) }),
  refuseNext: () =>
    fetch(`${MOCK_URL}/__mock/fail-next`, { method: 'POST', body: JSON.stringify({ status: 200, body: REFUSAL_BODY }) }),
  dropNextStream: () => fetch(`${MOCK_URL}/__mock/drop-next-stream`, { method: 'POST' }),
  streamPause: (ms: number) =>
    fetch(`${MOCK_URL}/__mock/stream-pause`, { method: 'POST', body: JSON.stringify({ ms }) }),
  delayNext: (ms: number) =>
    fetch(`${MOCK_URL}/__mock/delay-next`, { method: 'POST', body: JSON.stringify({ ms }) }),
  requests: async (): Promise<ClaudeRequest[]> => (await fetch(`${MOCK_URL}/__mock/requests`)).json(),
}

export interface StripeCall {
  path: string
  params: Record<string, string>
  idempotencyKey: string | null
}

export const mockStripe = {
  calls: async (): Promise<StripeCall[]> => (await fetch(`${MOCK_URL}/__mock/stripe`)).json(),
  setState: (state: {
    subscriptions?: string[]
    missingCustomer?: boolean
    customerError?: { status: number; code: string }
  }) =>
    fetch(`${MOCK_URL}/__mock/stripe-state`, { method: 'POST', body: JSON.stringify(state) }),
}

export const JOB = {
  title: 'Senior Backend Engineer',
  company: 'Acme',
  description: 'Acme is hiring a backend engineer to move our reporting stack from cron scripts to an event queue. You will work in TypeScript and Postgres on a team of six engineers. Kafka experience is a plus.',
  url: 'https://jobs.example.com/acme/123',
}

export const RESUME_TEXT = `Test Person
test@example.com | 555-0100

EXPERIENCE
Software Engineer, Initech, Austin, TX, Jan 2022 – Present
- Built billing export pipeline
- Maintained customer dashboard

Junior Developer, Globex, Remote, Jun 2020 – Dec 2021
- Fixed bugs in the web app

EDUCATION
State University, BS Computer Science, 2016 – 2020

SKILLS
TypeScript, Postgres, React`
