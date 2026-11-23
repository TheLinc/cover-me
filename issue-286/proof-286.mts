// Proof for #286: with their own Claude key, a user generates a letter from a
// pasted job. The fake Anthropic API returns a first draft that trips the
// letter check (it uses "delve"), then a 429 on the cleanup retry.
// Run from extension/: tsx proof-286.ts <dist dir> <before|after> <out dir>
import { join } from 'node:path'
import { generateFromPastedJob, launchExtension, seedOwnKey } from 'file:///F:/worktrees/cover-me/t3-2c244b53-b86ebbfd729cbd1f/extension/scripts/e2e.ts'

process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1'
const [dist, side, outDir] = process.argv.slice(2)
const DRAFT = 'Dear Hiring Manager,\n\nAt Initech I rebuilt the billing export in TypeScript, and I delve into data pipelines every week.\n\nKind regards,\nAlex Rivera'
const sse = (text: string) => [
  { type: 'message_start', message: { id: 'msg_1', role: 'assistant', content: [] } },
  { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } },
  { type: 'content_block_stop', index: 0 },
  { type: 'message_delta', delta: { stop_reason: 'end_turn' } },
  { type: 'message_stop' },
].map((ev) => `event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`).join('')

const { ctx, popupUrl } = await launchExtension({ dist, headless: true })
let calls = 0
await ctx.route('https://api.anthropic.com/**', (route) => {
  calls++
  const cors = { 'access-control-allow-origin': '*' }
  return calls === 1
    ? route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'text/event-stream' }, body: sse(DRAFT) })
    : route.fulfill({ status: 429, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ type: 'error', error: { type: 'rate_limit_error', message: 'Number of request tokens has exceeded your per-minute rate limit' } }) })
})
try {
  const popup = ctx.pages()[0] ?? await ctx.newPage()
  await popup.goto(popupUrl)
  await seedOwnKey(popup, { provider: 'claude', apiKey: 'sk-ant-test-key', resumeText: 'Alex Rivera\nSoftware Engineer, Initech, 2021-2025\n- Rebuilt the billing export in TypeScript.' })
  await generateFromPastedJob(popup, { title: 'Backend Engineer', company: 'Globex', description: 'Build event pipelines in Go and TypeScript for our billing team.' })
  const result = popup.locator('.error-box, .warning-box').or(popup.getByText('At Initech I rebuilt the billing export'))
  await result.first().waitFor({ timeout: 30_000 })
  await popup.screenshot({ path: join(outDir, `${side}-1-result.png`) })
  const shown = await result.first().innerText()
  console.log(JSON.stringify({ side, apiCalls: calls, shown: shown.slice(0, 120) }))
  if (calls !== 2) throw new Error(`expected the draft call and one retry, got ${calls} calls`)
  const gotDraft = shown.includes('At Initech I rebuilt the billing export')
  if (side === 'after' && !gotDraft) throw new Error('after: expected the first draft on screen')
  if (side === 'before' && gotDraft) throw new Error('before: expected the error; the bug did not reproduce')
} finally {
  await ctx.close()
}
