// Usage: npx tsx parse-request.ts <repo root> <before|after>
// Runs both parse paths (BYOK extension, hosted backend) of the given checkout
// with fetch stubbed, prints the request each sends to Anthropic, and checks a
// reply that starts with a thinking block still parses.
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'

const [root, mode] = process.argv.slice(2) as [string, 'before' | 'after']
const RESUME = { name: 'Dana Example', email: 'dana@example.com', phone: '', experience: [], education: [{ institution: 'Example College', degree: 'B.A.', location: '', dates: '2019 – 2023', bullets: [] }] }
const json = JSON.stringify(RESUME)
const sent: Record<string, unknown>[] = []

;(globalThis as Record<string, unknown>).Deno = { env: { get: () => undefined } }
globalThis.fetch = (async (_url: string, init: RequestInit) => {
  const body = JSON.parse(init.body as string)
  sent.push(body)
  if (body.stream) {
    const events = [
      { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'Reading the sections' } },
      { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: json } },
    ]
    return new Response(events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('') + 'data: [DONE]\n\n')
  }
  return new Response(JSON.stringify({ content: [{ type: 'thinking', thinking: '', signature: 's' }, { type: 'text', text: json }] }))
}) as typeof fetch

const ext = await import(pathToFileURL(`${root}/extension/src/lib/ai/resume-parse.ts`).href)
const be = await import(pathToFileURL(`${root}/backend/supabase/functions/_shared/resume-parse.ts`).href)
const byok = await ext.parseResumeStructure('Dana Example\nEDUCATION\nExample College', 'claude', 'test-key')
const hosted = await be.parseResumeStructure('Dana Example\nEDUCATION\nExample College', 'test-key')

for (const [path, body] of [['BYOK extension', sent[0]!], ['hosted backend', sent[1]!]] as const) {
  const { messages, ...fields } = body as { messages: unknown }
  console.log(`${mode} ${path}: ${JSON.stringify(fields)}`)
  if (mode === 'after') assert.deepEqual(fields.model === undefined ? null : { model: (fields as Record<string, unknown>).model, output_config: (fields as Record<string, unknown>).output_config, max_tokens: (fields as Record<string, unknown>).max_tokens }, { model: 'claude-haiku-5-5', output_config: { effort: 'low' }, max_tokens: 16000 })
  else assert.equal((fields as Record<string, unknown>).model, 'claude-haiku-4-5')
}
assert.equal(byok.name, 'Dana Example')
assert.equal(hosted.name, 'Dana Example')
console.log(`${mode}: both paths parsed a reply that starts with a thinking block -> name "${byok.name}", education "${hosted.education[0].institution}"`)
