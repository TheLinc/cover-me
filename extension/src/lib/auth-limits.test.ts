import { afterEach, describe, expect, test, vi } from 'vitest'
import { generateViaBackend, limitErrorCode, RateLimitError } from './auth'

const job = { title: 'Clerk', company: 'Acme', description: 'x'.repeat(200), url: 'https://example.com/1' }
const respond429 = (kind: string) => vi.stubGlobal('fetch', vi.fn(async () => new Response(
  JSON.stringify({ error: 'limit', allowance: { kind } }), { status: 429, headers: { 'content-type': 'application/json' } })))

afterEach(() => vi.unstubAllGlobals())

describe('rate limit errors', () => {
  test('carry the kind of limit the server applied', async () => {
    respond429('daily')
    const err = await generateViaBackend(job, 'token').catch((e) => e)
    expect(err).toBeInstanceOf(RateLimitError)
    expect(err.kind).toBe('daily')
  })

  // A Pro user at the 25-a-day cap must not be offered "Upgrade to Pro".
  test("Pro's daily cap is FAIR_USE, the free limits are RATE_LIMIT", () => {
    expect(limitErrorCode(new RateLimitError('x', 'daily'))).toBe('FAIR_USE')
    expect(limitErrorCode(new RateLimitError('x', 'weekly'))).toBe('RATE_LIMIT')
    expect(limitErrorCode(new RateLimitError('x'))).toBe('RATE_LIMIT')
  })
})
