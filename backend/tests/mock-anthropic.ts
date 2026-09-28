// Stand-in for api.anthropic.com during function tests. The served functions
// reach it through ANTHROPIC_BASE_URL (http://host.docker.internal:<port>).
//
// Routes:
//   POST /v1/messages          canned reply picked by request shape (see reply())
//   POST /__mock/fail-next     { status, body? } → the next /v1/messages call fails
//   GET  /__mock/requests      every /v1/messages body received since the last reset
//   POST /__mock/reset         clears recorded requests and queued failures

import { createServer, type IncomingMessage, type Server } from 'node:http'

export const MOCK_LETTER = `Dear Acme Team,

At Initech I rebuilt the billing export pipeline in TypeScript and cut nightly run time from four hours to forty minutes. Acme's posting describes a reporting stack that has outgrown its batch jobs, and that is work I have done before.

Over three years I owned the data services behind Initech's customer dashboard. I moved the heaviest queries onto Postgres materialized views, added load tests before each release, and paired with support so the slow pages they reported got fixed first. When the on-call rotation shrank to two people, I wrote the runbooks that let new engineers take a shift in their second week.

The posting mentions a move from cron scripts to an event queue. I ran a similar migration at Initech, including the month both systems ran side by side. Acme's team of six engineers matches the group I work in now.

I'd like to talk about how the Initech migration went and what I would change next time.

Kind regards,

Test Person`

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

type MessagesBody = { model?: string; stream?: boolean; messages?: Array<{ role: string; content: string }> }

const received: MessagesBody[] = []
const failures: Array<{ status: number; body: string }> = []

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
      failures.length = 0
      return res.writeHead(204).end()
    }
    if (req.method === 'POST' && url === '/__mock/fail-next') {
      const { status = 500, body = '{"type":"error","error":{"type":"api_error","message":"mock failure"}}' } =
        JSON.parse((await readBody(req)) || '{}')
      failures.push({ status, body: typeof body === 'string' ? body : JSON.stringify(body) })
      return res.writeHead(204).end()
    }
    if (req.method === 'GET' && url === '/__mock/requests') {
      res.writeHead(200, { 'content-type': 'application/json' })
      return res.end(JSON.stringify(received))
    }

    if (req.method === 'POST' && url === '/v1/messages') {
      const body = JSON.parse(await readBody(req)) as MessagesBody
      received.push(body)

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
      if (body.stream) {
        res.writeHead(200, { 'content-type': 'text/event-stream' })
        return res.end(sseBody(JSON.stringify(MOCK_TAILOR_DELTA)))
      }
      res.writeHead(200, { 'content-type': 'application/json' })
      if (body.model?.includes('haiku')) return res.end(messageJson(JSON.stringify(MOCK_PARSED_RESUME), body.model))
      return res.end(messageJson(MOCK_LETTER, body.model))
    }

    res.writeHead(404).end()
  })

  return new Promise((resolve, reject) => {
    server.once('error', reject)
    // 0.0.0.0 so the Edge Runtime container can reach it via host.docker.internal.
    server.listen(port, '0.0.0.0', () => resolve(server))
  })
}
