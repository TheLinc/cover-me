// Stand-in for api.anthropic.com during function tests. The served functions
// reach it through ANTHROPIC_BASE_URL (http://host.docker.internal:<port>).
//
// Routes:
//   POST /v1/messages          canned reply picked by request shape (see reply())
//   POST /__mock/fail-next     { status, body? } → the next /v1/messages call fails
//   POST /__mock/delay-next    { ms } → the next /v1/messages call answers after ms
//   GET  /__mock/requests      every /v1/messages body received since the last reset
//   POST /__mock/reset         clears recorded requests and queued failures
//   POST /v1/customers, /v1/checkout/sessions, /v1/billing_portal/sessions
//                              Stripe stand-ins (billing function, via STRIPE_API_BASE)
//   GET  /__mock/stripe        every Stripe call received since the last reset

import { createServer, type IncomingMessage, type Server } from 'node:http'

export const MOCK_LETTER = `Dear Acme Team,

At Initech I rebuilt the billing export pipeline in TypeScript and cut nightly run time from four hours to forty minutes. Acme's posting describes a reporting stack that has outgrown its batch jobs, and that is work I have done before.

Over three years I owned the data services behind Initech's customer dashboard. I moved the heaviest queries onto Postgres materialized views, added load tests before each release, and paired with support so the slow pages they reported got fixed first. When the on-call rotation shrank to two people, I wrote the runbooks that let new engineers take a shift in their second week.

The posting mentions a move from cron scripts to an event queue. I ran a similar migration at Initech, including the month both systems ran side by side. Acme's team of six engineers matches the group I work in now.

I'd like to talk about how the Initech migration went and what I would change next time.

Kind regards,

Test Person`

// What the mock line rewrite returns for the flagged bullet (see /v1/messages below).
export const MOCK_REWRITTEN_BULLET = 'Rebuilt the billing export pipeline in TypeScript'

export const MOCK_PARSED_RESUME = {
  name: 'Test Person',
  email: 'test@example.com',
  phone: '555-0100',
  website: '',
  experience: [
    {
      title: 'Software Engineer',
      company: 'Initech',
      location: 'Austin, TX',
      dates: 'Jan 2022 – Present',
      bullets: ['Built billing export pipeline', 'Maintained customer dashboard'],
    },
    {
      title: 'Junior Developer',
      company: 'Globex',
      location: 'Remote',
      dates: 'Jun 2020 – Dec 2021',
      bullets: ['Fixed bugs in the web app'],
    },
  ],
  education: [
    { institution: 'State University', degree: 'BS Computer Science', location: 'Austin, TX', dates: '2016 – 2020', bullets: [] },
  ],
  skills: 'TypeScript, Postgres, React',
}

export const MOCK_TAILOR_DELTA = {
  summary: 'Software engineer with four years building data services in TypeScript and Postgres.',
  experience: [
    { bullets: ['Rebuilt the billing export pipeline in TypeScript, cutting run time from 4 hours to 40 minutes', 'Owned Postgres-backed customer dashboard services'] },
    { bullets: ['Fixed production bugs across the React web app'] },
  ],
  // Current prompt format: added skills cite resume evidence. "Data Pipelines"
  // is backed by a real bullet; "Kafka" cites evidence the resume lacks.
  skills: [
    { skill: 'TypeScript' },
    { skill: 'Postgres' },
    { skill: 'React' },
    { skill: 'Data Pipelines', evidence: 'Built billing export pipeline' },
    { skill: 'Kafka', evidence: 'event streaming' },
  ],
  keywordMatch: {
    tier1Covered: ['TypeScript', 'Postgres'],
    tier1Missing: ['Kafka'],
    tier2Covered: ['React'],
    tier2Missing: [],
    gatingGaps: [],
  },
}

type MessagesBody = {
  model?: string
  stream?: boolean
  messages?: Array<{ role: string; content: string }>
  thinking?: { type: string }
  fallbacks?: unknown
  /** The anthropic-beta request header, recorded so tests can check it. */
  betaHeader?: string
}

const received: MessagesBody[] = []
const failures: Array<{ status: number; body: string }> = []
let delayNext = 0

type StripeCall = { path: string; params: Record<string, string>; idempotencyKey: string | null }
const stripeCalls: StripeCall[] = []
// What GET /v1/subscriptions answers: these statuses, or "No such customer".
// customerError makes the next POST /v1/customers fail once with that error.
const stripeState = {
  subscriptions: [] as string[],
  missingCustomer: false,
  customerError: null as { status: number; code: string } | null,
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (c) => (data += c))
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function messageJson(text: string, model = 'mock') {
  return JSON.stringify({
    id: 'msg_mock',
    type: 'message',
    role: 'assistant',
    model,
    content: [{ type: 'text', text }],
    stop_reason: 'end_turn',
    usage: { input_tokens: 1, output_tokens: 1 },
  })
}

// Anthropic SSE framing, split into several text deltas so the tailor
// function's NDJSON relay has more than one fragment to forward.
function sseBody(text: string): string {
  const chunks = text.match(/[\s\S]{1,80}/g) ?? []
  const events: unknown[] = [
    { type: 'message_start', message: { id: 'msg_mock', type: 'message', role: 'assistant', content: [] } },
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    ...chunks.map((c) => ({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: c } })),
    { type: 'content_block_stop', index: 0 },
    { type: 'message_stop' },
  ]
  return events.map((e) => `event: ${(e as { type: string }).type}\ndata: ${JSON.stringify(e)}\n\n`).join('')
}

export function startMockAnthropic(port: number): Promise<Server> {
  const server = createServer(async (req, res) => {
    const url = req.url ?? '/'

    if (req.method === 'POST' && url === '/__mock/reset') {
      received.length = 0
      stripeCalls.length = 0
      stripeState.subscriptions = []
      stripeState.missingCustomer = false
      stripeState.customerError = null
      failures.length = 0
      delayNext = 0
      return res.writeHead(204).end()
    }
    if (req.method === 'POST' && url === '/__mock/fail-next') {
      const { status = 500, body = '{"type":"error","error":{"type":"api_error","message":"mock failure"}}' } =
        JSON.parse((await readBody(req)) || '{}')
      failures.push({ status, body: typeof body === 'string' ? body : JSON.stringify(body) })
      return res.writeHead(204).end()
    }
    if (req.method === 'POST' && url === '/__mock/delay-next') {
      delayNext = JSON.parse(await readBody(req)).ms
      return res.writeHead(204).end()
    }
    if (req.method === 'GET' && url === '/__mock/requests') {
      res.writeHead(200, { 'content-type': 'application/json' })
      return res.end(JSON.stringify(received))
    }

    if (req.method === 'POST' && url === '/v1/messages') {
      const body = JSON.parse(await readBody(req)) as MessagesBody
      const beta = req.headers['anthropic-beta']
      received.push({ ...body, betaHeader: typeof beta === 'string' ? beta : undefined })
      if (delayNext) {
        const ms = delayNext
        delayNext = 0
        await new Promise((r) => setTimeout(r, ms))
      }

      const failure = failures.shift()
      if (failure) {
        res.writeHead(failure.status, { 'content-type': 'application/json' })
        return res.end(failure.body)
      }

      // Tailor is the only streaming call; the skill-claim check and the resume
      // parse run on Haiku; everything else is a cover letter.
      const prompt = body.messages?.[0]?.content ?? ''
      if (prompt.startsWith('SKILL CLAIM CHECK')) {
        // Approve every pair: the tests assert which skills survive grounding.
        const count = (prompt.match(/^\d+\. EVIDENCE:/gm) ?? []).length
        const verdicts = Array.from({ length: count }, (_, i) => ({ i, ok: true }))
        res.writeHead(200, { 'content-type': 'application/json' })
        return res.end(messageJson(JSON.stringify({ verdicts }), body.model))
      }
      // Line check: flag the tailor output's invented metric ("4 hours to 40
      // minutes" is not in the resume). Line rewrite: fix each flagged id.
      if (prompt.startsWith('RESUME ACCURACY CHECK')) {
        const id = /\[(e\d+b\d+)\][^\n]*4 hours to 40 minutes/.exec(prompt)?.[1]
        const flags = id ? [{ id, reason: 'invented run-time numbers' }] : []
        res.writeHead(200, { 'content-type': 'application/json' })
        return res.end(messageJson(JSON.stringify({ flags, summary: null }), body.model))
      }
      if (prompt.startsWith('RESUME LINE REWRITE')) {
        const rewrites = [...prompt.matchAll(/^\[(e\d+b\d+)\]/gm)].map((m) => ({ id: m[1], text: MOCK_REWRITTEN_BULLET }))
        res.writeHead(200, { 'content-type': 'application/json' })
        return res.end(messageJson(JSON.stringify({ rewrites }), body.model))
      }
      if (body.stream) {
        res.writeHead(200, { 'content-type': 'text/event-stream' })
        return res.end(sseBody(JSON.stringify(MOCK_TAILOR_DELTA)))
      }
      res.writeHead(200, { 'content-type': 'application/json' })
      if (body.model?.includes('haiku')) return res.end(messageJson(JSON.stringify(MOCK_PARSED_RESUME), body.model))
      return res.end(messageJson(MOCK_LETTER, body.model))
    }

    if (req.method === 'GET' && url === '/__mock/stripe') {
      res.writeHead(200, { 'content-type': 'application/json' })
      return res.end(JSON.stringify(stripeCalls))
    }
    if (req.method === 'POST' && url === '/__mock/stripe-state') {
      Object.assign(stripeState, JSON.parse((await readBody(req)) || '{}'))
      return res.writeHead(204).end()
    }
    if (req.method === 'GET' && url.startsWith('/v1/subscriptions?')) {
      stripeCalls.push({ path: '/v1/subscriptions', params: Object.fromEntries(new URL(url, 'http://mock').searchParams), idempotencyKey: null })
      if (stripeState.missingCustomer) {
        res.writeHead(400, { 'content-type': 'application/json' })
        return res.end(JSON.stringify({ error: { type: 'invalid_request_error', code: 'resource_missing', param: 'customer' } }))
      }
      res.writeHead(200, { 'content-type': 'application/json' })
      return res.end(JSON.stringify({ data: stripeState.subscriptions.map((status) => ({ status })) }))
    }
    if (req.method === 'POST' && ['/v1/customers', '/v1/checkout/sessions', '/v1/billing_portal/sessions'].includes(url)) {
      const params = Object.fromEntries(new URLSearchParams(await readBody(req)))
      const key = req.headers['idempotency-key']
      stripeCalls.push({ path: url, params, idempotencyKey: typeof key === 'string' ? key : null })
      if (url === '/v1/customers' && stripeState.customerError) {
        const { status, code } = stripeState.customerError
        stripeState.customerError = null
        res.writeHead(status, { 'content-type': 'application/json' })
        return res.end(JSON.stringify({ error: { type: 'idempotency_error', code } }))
      }
      const n = stripeCalls.length
      const reply =
        url === '/v1/customers' ? { id: `cus_mock_${n}` }
        : url === '/v1/checkout/sessions' ? { id: `cs_mock_${n}`, url: `https://checkout.stripe.test/cs_mock_${n}` }
        : { url: 'https://billing.stripe.test/portal' }
      res.writeHead(200, { 'content-type': 'application/json' })
      return res.end(JSON.stringify(reply))
    }

    res.writeHead(404).end()
  })

  return new Promise((resolve, reject) => {
    server.once('error', reject)
    // 0.0.0.0 so the Edge Runtime container can reach it via host.docker.internal.
    server.listen(port, '0.0.0.0', () => resolve(server))
  })
}
