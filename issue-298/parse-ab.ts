import { writeFileSync } from 'node:fs'
import { buildParsePrompt, parseParsedJson } from '../src/lib/ai/resume-parse'
import { CASES } from './fixtures'
import { checkParse } from './checks'
import { call, claudeIsolation, pool, usage } from './model'

const ARMS = [
  { name: 'haiku-4-5', model: 'claude-haiku-4-5', thinkingOff: false },
  { name: 'haiku-5-5 effort low', model: 'claude-haiku-5-5', thinkingOff: false },
  { name: 'haiku-5-5 effort low, thinking off', model: 'claude-haiku-5-5', thinkingOff: true },
]
const OUT = process.argv[2]!

console.log(claudeIsolation())
const rows: unknown[] = []
for (const arm of ARMS.filter((a) => !process.env.ARM || a.name === process.env.ARM)) {
  if (arm.thinkingOff) process.env.MAX_THINKING_TOKENS = '0'
  else delete process.env.MAX_THINKING_TOKENS
  const start = usage.log.length
  const picked = process.env.CASES ? process.env.CASES.split(',').flatMap((id) => Array(Number(process.env.REPEAT ?? 1)).fill(CASES.find((c) => c.id === id)!)) : CASES
  const results = await pool(picked, 6, async (c) => {
    const t = performance.now()
    let failures: string[]
    try {
      const raw = await call([{ role: 'user', content: buildParsePrompt(c.resumeText) }], { model: arm.model, maxTokens: 8000, label: 'parse' })
      failures = checkParse(parseParsedJson(raw, c.resumeText), c).failures
    } catch (e) {
      failures = [`unusable: ${e instanceof Error ? e.message : e}`]
    }
    return { id: c.id, seconds: (performance.now() - t) / 1000, failures }
  })
  const log = usage.log.slice(start)
  const secs = results.map((r) => r.seconds).sort((a, b) => a - b)
  const summary = {
    arm: arm.name,
    pass: results.filter((r) => !r.failures.length).length,
    of: results.length,
    medianSeconds: secs[Math.floor(secs.length / 2)],
    meanSeconds: secs.reduce((a, b) => a + b, 0) / secs.length,
    meanOutputTokens: log.reduce((n, e) => n + e.output, 0) / log.length,
    meanInputTokens: log.reduce((n, e) => n + e.input, 0) / log.length,
    failed: results.filter((r) => r.failures.length).map((r) => ({ id: r.id, failures: r.failures })),
  }
  console.log(JSON.stringify({ ...summary, failed: summary.failed.map((f) => `${f.id}: ${f.failures.join(' | ')}`) }, null, 2))
  rows.push({ ...summary, results })
}
writeFileSync(OUT, JSON.stringify(rows, null, 2))
