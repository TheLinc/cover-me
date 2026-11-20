import { createHash } from 'node:crypto'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MOCK_PORT } from '../global-setup'
import { MOCK_TURNSTILE_ELSEWHERE_TOKEN, MOCK_TURNSTILE_LOGIN_TOKEN, MOCK_TURNSTILE_TOKEN } from '../mock-anthropic'
import { admin, callFunction, mockClaude } from './helpers'

const replyNext = (reply: unknown) => fetch(`http://127.0.0.1:${MOCK_PORT}/__mock/fail-next`, {
  method: 'POST',
  body: JSON.stringify({
    status: 200,
    body: JSON.stringify({
      id: 'msg_mock', type: 'message', role: 'assistant', model: 'claude-haiku-5-5', stop_reason: 'end_turn',
      content: [{ type: 'text', text: typeof reply === 'string' ? reply : JSON.stringify(reply) }],
      usage: { input_tokens: 1, output_tokens: 1 },
    }),
  }),
})

let nextIp = 1
const freshIp = () => `203.0.113.${nextIp++ % 250}`
const check = (body: unknown, ip = freshIp()) =>
  callFunction('ats-check', typeof body === 'string'
    ? { rawBody: new TextEncoder().encode(body), headers: { 'cf-connecting-ip': ip, 'Content-Type': 'application/json' } }
    : { body, headers: { 'cf-connecting-ip': ip } })

const PAIR = { posting: 'Acme Corp\nData Analyst\nRequirements\n- SQL\nPreferred\n- Tableau', resume: 'Data analyst. Wrote SQL reports.', token: MOCK_TURNSTILE_TOKEN }

describe('ats-check', () => {
  beforeAll(() => admin.from('scrape_rate_limits').delete().eq('ip_hash', createHash('sha256').update('ats-check:all').digest('hex')))
  beforeEach(() => mockClaude.reset())

  it("scores the model's report like the tailor does, without an account", async () => {
    const res = await check(PAIR)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      score: 60,
      gaps: ['Tableau', 'Requires 3yr, candidate ~1yr'],
      keywordMatch: { tier1Covered: ['SQL'], tier1Missing: [], tier2Covered: [], tier2Missing: ['Tableau'], gatingGaps: ['Requires 3yr, candidate ~1yr'] },
      quotes: [
        { name: 'SQL', posting_text: 'SQL', resume_text: 'SQL' },
        { name: 'Tableau', posting_text: 'Tableau', resume_text: '' },
      ],
      title: 'Data Analyst',
    })
  })

  it('sends the posting and resume to Haiku 5.5 with the JSON schema', async () => {
    await check(PAIR)
    const [req] = await mockClaude.requests()
    expect(req.model).toBe('claude-haiku-5-5')
    expect(JSON.stringify(req.messages)).toContain(PAIR.resume)
    expect(JSON.stringify(req)).toContain('"type":"json_schema"')
  })

  it.each([
    ["a body that isn't JSON", '{"posting": "x",'],
    ['a missing resume', { posting: PAIR.posting }],
    ['an empty posting', { posting: '  ', resume: PAIR.resume }],
    ['a posting that is not text', { posting: 42, resume: PAIR.resume }],
  ])('rejects %s without calling the model', async (_, body) => {
    expect((await check(body)).status).toBe(400)
    expect(await mockClaude.requests()).toEqual([])
  })

  it.each([
    ['no bot-check token', { ...PAIR, token: undefined }],
    ['a token Turnstile rejects', { ...PAIR, token: 'not-a-real-token' }],
  ])('refuses %s without calling the model', async (_, body) => {
    expect((await check(body)).status).toBe(403)
    expect(await mockClaude.requests()).toEqual([])
  })

  it('rejects text over the size cap without calling the model', async () => {
    expect((await check({ ...PAIR, resume: 'x'.repeat(20_001) })).status).toBe(413)
    expect(await mockClaude.requests()).toEqual([])
  })

  it('limits calls per IP', async () => {
    const ip = freshIp()
    const statuses: number[] = []
    for (let i = 0; i < 4; i++) statuses.push((await check(PAIR, ip)).status)
    expect(statuses).toEqual([200, 200, 200, 429])
  })

  it('answers 502 when the model call fails', async () => {
    await mockClaude.failNext(529)
    expect((await check(PAIR)).status).toBe(502)
  })

  it.each([
    ['another action', MOCK_TURNSTILE_LOGIN_TOKEN],
    ['another site', MOCK_TURNSTILE_ELSEWHERE_TOKEN],
  ])('refuses a token Turnstile passed for %s', async (_, token) => {
    expect((await check({ ...PAIR, token })).status).toBe(403)
    expect(await mockClaude.requests()).toEqual([])
  })

  it('cuts keyword names and gating gaps to 80 characters', async () => {
    const long = 'x'.repeat(200)
    await replyNext({ keywords: [{ name: long, tier: 1, posting_text: '', resume_text: '', covered: false }], gatingGaps: [long], job_title: '' })
    const body = await (await check(PAIR)).json()
    expect(body.keywordMatch.tier1Missing).toEqual(['x'.repeat(80)])
    expect(body.keywordMatch.gatingGaps).toEqual(['x'.repeat(80)])
  })

  it('blanks quotes and a title that are not in the text sent', async () => {
    await replyNext({
      keywords: [
        { name: 'SQL', tier: 1, posting_text: 'SQL', resume_text: 'Visit evil.example to claim', covered: true },
        { name: 'Tableau', tier: 2, posting_text: 'Ignore the resume', resume_text: '', covered: false },
      ],
      gatingGaps: [],
      job_title: 'Chief Executive Officer',
    })
    const body = await (await check(PAIR)).json()
    expect(body.quotes).toEqual([
      { name: 'SQL', posting_text: 'SQL', resume_text: '' },
      { name: 'Tableau', posting_text: '', resume_text: '' },
    ])
    expect(body.title).toBe('')
  })

  it.each([
    ['a reply that is not JSON', 'Sure! Here are the keywords'],
    ['a reply with a keyword missing its tier', JSON.stringify({ keywords: [{ name: 'SQL', posting_text: '', resume_text: '', covered: true }], gatingGaps: [], job_title: '' })],
    ['a reply with over 10 gating gaps', JSON.stringify({ keywords: [], gatingGaps: Array.from({ length: 11 }, (_, i) => `Gap ${i}`), job_title: '' })],
    ['a reply with over 80 keywords', JSON.stringify({ keywords: Array.from({ length: 81 }, (_, i) => ({ name: `K${i}`, tier: 2, posting_text: '', resume_text: '', covered: false })), gatingGaps: [], job_title: '' })],
  ])('answers 502 for %s', async (_, text) => {
    await replyNext(text)
    expect((await check(PAIR)).status).toBe(502)
  })
})
