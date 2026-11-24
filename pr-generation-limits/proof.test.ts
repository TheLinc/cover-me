import { appendFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { callFunction, clearParsedResume, createUser, deleteUser, JOB, mockClaude, quotaUsedToday, REFUSAL_BODY, setUsage, type TestUser, uploadResume } from './helpers'

const AFTER = process.env.PROOF_VERSION === 'after'
const OUT = process.env.PROOF_OUT!
const log = (line: string) => appendFileSync(OUT, line + '\n')
const reply = (body: string) => fetch(`http://127.0.0.1:${process.env.MOCK_ANTHROPIC_PORT}/__mock/fail-next`, { method: 'POST', body: JSON.stringify({ status: 200, body }) })
const ndjson = { Accept: 'application/x-ndjson' }

describe(`proof (${AFTER ? 'after' : 'before'})`, () => {
  let user: TestUser | undefined
  beforeEach(async () => {
    await mockClaude.reset()
    user = await createUser()
    await uploadResume(user)
  })
  afterEach(async () => {
    await deleteUser(user)
    user = undefined
  })

  it('1. tailor, job description sent as an array, streaming, from 9 of 10 used', async () => {
    await setUsage(user!.id, [{ daysAgo: 0, count: 9 }])
    const res = await callFunction('tailor', { token: user!.token, body: { job: { ...JOB, description: [JOB.description] } }, headers: ndjson })
    const text = await res.text()
    const types = res.headers.get('content-type')?.includes('ndjson') ? text.split('\n').filter(Boolean).map((l) => JSON.parse(l).type) : text
    const calls = (await mockClaude.requests()).length
    const used = await quotaUsedToday(user!.id)
    log(`## 1. tailor, description: ["..."], Accept: application/x-ndjson, usage 9 of 10\nstatus ${res.status}, body ${JSON.stringify(types)}\nmodel calls ${calls}, usage after ${used}\n`)
    if (AFTER) { expect(res.status).toBe(400); expect(calls).toBe(0); expect(used).toBe(9) } else { expect([...new Set(types)]).toEqual(['start', 'thinking', 'delta', 'error']); expect(used).toBe(9) }
  })

  it('2. generate, model declines (200, no text)', async () => {
    await reply(REFUSAL_BODY)
    const res = await callFunction('generate', { token: user!.token, body: { job: JOB } })
    const body = await res.json()
    const used = await quotaUsedToday(user!.id)
    log(`## 2. generate, model replies 200 with stop_reason "refusal" and no text\nstatus ${res.status}, body ${JSON.stringify(body)}\nusage after ${used}\n`)
    expect(used).toBe(AFTER ? 1 : 0)
  })

  it('3. generate, Anthropic returns 529', async () => {
    await mockClaude.failNext(529)
    const res = await callFunction('generate', { token: user!.token, body: { job: JOB } })
    const body = await res.json()
    const used = await quotaUsedToday(user!.id)
    log(`## 3. generate, Anthropic answers 529 overloaded\nstatus ${res.status}, body ${JSON.stringify(body)}\nusage after ${used}\n`)
    expect(used).toBe(0)
  })

  it('4. tailor, resume parse reply is not JSON', async () => {
    await clearParsedResume(user!.id)
    await reply(JSON.stringify({ type: 'message', role: 'assistant', content: [{ type: 'text', text: 'Sorry, I cannot help.' }], stop_reason: 'end_turn' }))
    const res = await callFunction('tailor', { token: user!.token, body: { job: JOB } })
    const body = await res.json()
    const used = await quotaUsedToday(user!.id)
    log(`## 4. tailor, the resume parse reply is "Sorry, I cannot help."\nstatus ${res.status}, body ${JSON.stringify(body)}\nusage after ${used}\n`)
    expect(used).toBe(AFTER ? 1 : 0)
  })

  it('5. tailor, 160,000-character posting vs 15,000', async () => {
    const word = (n: number) => { let w = 'Q'; for (let k = 0; k < 4; k++, n = Math.floor(n / 26)) w += String.fromCharCode(97 + (n % 26)); return w }
    const posting = (n: number) => { let o = 'Platform Engineer. '; for (let i = 0; o.length < n; i++) o += `and ${word(i)} `; return o.slice(0, n) }
    const run = async (n: number) => {
      const started = Date.now()
      const res = await callFunction('tailor', { token: user!.token, body: { job: { ...JOB, description: posting(n) } } })
      await res.text()
      return { status: res.status, ms: Date.now() - started }
    }
    const small = await run(15_000)
    const big = await run(160_000)
    log(`## 5. tailor, posting of distinct capitalized words\n15,000 chars: status ${small.status}, ${small.ms} ms\n160,000 chars: status ${big.status}, ${big.ms} ms\n`)
    if (AFTER) expect(big.status).toBe(200)
  }, 60_000)

  it('6. generate, 1.1 MB body', async () => {
    const res = await callFunction('generate', { token: user!.token, body: { job: JOB, supplemental: 'x'.repeat(1_100_000) } })
    const body = await res.text()
    const used = await quotaUsedToday(user!.id)
    log(`## 6. generate, 1.1 MB body (supplemental of 1,100,000 chars)\nstatus ${res.status}, body ${body.length > 200 ? `${body.length} chars` : body}\nusage after ${used}\n`)
    expect(res.status).toBe(AFTER ? 413 : 200)
  }, 60_000)
})
