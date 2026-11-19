import { beforeEach, describe, expect, it } from 'vitest'
import { MOCK_ATS_KEYWORDS } from '../mock-anthropic'
import { callFunction, mockClaude } from './helpers'

let nextIp = 1
const freshIp = () => `203.0.113.${nextIp++ % 250}`
const check = (body: unknown, ip = freshIp()) =>
  callFunction('ats-check', typeof body === 'string'
    ? { rawBody: new TextEncoder().encode(body), headers: { 'cf-connecting-ip': ip, 'Content-Type': 'application/json' } }
    : { body, headers: { 'cf-connecting-ip': ip } })

const PAIR = { posting: 'Requirements\n- SQL\nPreferred\n- Tableau', resume: 'Data analyst. Wrote SQL reports.' }

describe('ats-check', () => {
  beforeEach(() => mockClaude.reset())

  it('returns the keywords the model reports, without an account', async () => {
    const res = await check(PAIR)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ keywords: MOCK_ATS_KEYWORDS })
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

  it('rejects text over the size cap without calling the model', async () => {
    expect((await check({ posting: PAIR.posting, resume: 'x'.repeat(30_001) })).status).toBe(413)
    expect(await mockClaude.requests()).toEqual([])
  })

  it('limits calls per IP', async () => {
    const ip = freshIp()
    const statuses: number[] = []
    for (let i = 0; i < 7; i++) statuses.push((await check(PAIR, ip)).status)
    expect(statuses).toEqual([200, 200, 200, 200, 200, 200, 429])
  })

  it('answers 502 when the model call fails', async () => {
    await mockClaude.failNext(529)
    expect((await check(PAIR)).status).toBe(502)
  })
})
