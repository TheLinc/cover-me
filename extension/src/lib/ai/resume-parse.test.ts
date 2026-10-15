import { afterEach, describe, expect, test, vi } from 'vitest'
import { parseResumeStructure } from './resume-parse'

const RESUME = { name: 'A', email: 'a@x.co', experience: [], education: [{ institution: 'U of T' }] }
const json = JSON.stringify(RESUME)
const sse = (events: unknown[]) => new Response(events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('') + 'data: [DONE]\n\n')

afterEach(() => vi.unstubAllGlobals())

describe('parseResumeStructure streams', () => {
  test('Claude: joins the text deltas', async () => {
    const fetch = vi.fn(async (_url: string, _init: RequestInit) => sse([json.slice(0, 20), json.slice(20)].map((text) => ({ type: 'content_block_delta', delta: { type: 'text_delta', text } }))))
    vi.stubGlobal('fetch', fetch)
    expect(await parseResumeStructure('r', 'claude', 'k')).toEqual(RESUME)
    expect(JSON.parse(fetch.mock.calls[0]![1].body as string).stream).toBe(true)
  })
  test('OpenAI: joins the Chat Completions deltas', async () => {
    const fetch = vi.fn(async (_url: string, _init: RequestInit) => sse([json.slice(0, 20), json.slice(20)].map((content) => ({ choices: [{ delta: { content } }] }))))
    vi.stubGlobal('fetch', fetch)
    expect(await parseResumeStructure('r', 'openai', 'k')).toEqual(RESUME)
    expect(JSON.parse(fetch.mock.calls[0]![1].body as string).stream).toBe(true)
  })
  test("OpenAI: a mid-stream error surfaces OpenAI's message", async () => {
    vi.stubGlobal('fetch', vi.fn(async () => sse([{ choices: [{ delta: { content: '{' } }] }, { error: { message: 'Server overloaded' } }])))
    await expect(parseResumeStructure('r', 'openai', 'k')).rejects.toThrow('Server overloaded')
  })
})
