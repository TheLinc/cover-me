// Stands in for api.anthropic.com for own-key runs. The backend mock streams
// only tailor output, so own-key letters and answers (also streamed) get the
// mock letter here; everything else goes to the backend mock unchanged.
import http from 'node:http'

const MOCK = 'http://127.0.0.1:55990'
const { MOCK_LETTER, MOCK_PARSED_RESUME } = await import('file:///<repo>/backend/tests/mock-anthropic.ts')
const TAILOR = 'You are an expert resume writer and ATS optimization specialist.'
const seen = []

function sse(text) {
  const chunks = text.match(/[\s\S]{1,80}/g) ?? []
  const events = [
    { type: 'message_start', message: { id: 'msg_shim', type: 'message', role: 'assistant', content: [] } },
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    ...chunks.map((c) => ({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: c } })),
    { type: 'content_block_stop', index: 0 },
    { type: 'message_stop' },
  ]
  return events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join('')
}

const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, GET, OPTIONS' }

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end() }
  if (req.url === '/__shim/requests') { res.writeHead(200, { 'content-type': 'application/json', ...cors }); return res.end(JSON.stringify(seen)) }
  if (req.url === '/__shim/reset') { seen.length = 0; res.writeHead(200, cors); return res.end('{}') }
  const chunks = []
  for await (const c of req) chunks.push(c)
  const raw = Buffer.concat(chunks).toString()
  const body = raw ? JSON.parse(raw) : {}
  const first = body.messages?.[0]?.content
  const prompt = typeof first === 'string' ? first : Array.isArray(first) ? first.map((b) => b.text ?? '').join('') : ''
  const kind = body.stream ? (body.model?.includes('haiku') ? 'parse' : prompt.includes(TAILOR) ? 'tailor' : /^(SKILL CLAIM CHECK|RESUME ACCURACY CHECK|RESUME LINE REWRITE)/.test(prompt) ? 'check' : 'letter-or-answer') : body.model?.includes('haiku') ? 'parse-plain' : 'other'
  seen.push({ kind, model: body.model, head: prompt.slice(0, 60) })
  if (kind === 'parse') {
    res.writeHead(200, { 'content-type': 'text/event-stream', ...cors })
    return res.end(sse(JSON.stringify(MOCK_PARSED_RESUME)))
  }
  if (kind === 'check') {
    const up = await (await fetch(`${MOCK}/v1/messages`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, stream: false }) })).json()
    res.writeHead(200, { 'content-type': 'text/event-stream', ...cors })
    return res.end(sse(up.content?.[0]?.text ?? ''))
  }
  if (kind === 'letter-or-answer') {
    res.writeHead(200, { 'content-type': 'text/event-stream', ...cors })
    return res.end(sse(MOCK_LETTER))
  }
  const up = await fetch(`${MOCK}${req.url}`, { method: req.method, headers: { 'content-type': 'application/json' }, body: raw || undefined })
  res.writeHead(up.status, { 'content-type': up.headers.get('content-type') ?? 'application/json', ...cors })
  res.end(Buffer.from(await up.arrayBuffer()))
}).listen(55991, '127.0.0.1', () => console.log('shim on 55991'))
