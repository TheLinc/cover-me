// Proof for #348. Copy to <checkout>/extension/eval/reports/ and run from extension/:
//   pnpm exec tsx ./eval/reports/proof-parse-dates.ts <before|after> <runs>
// Parses the uk-finance-assistant resume with this checkout's real buildParsePrompt
// on Haiku 5.5 at low effort (the production parse settings), through `claude -p`.
// "after" fails unless every run keeps the dates as written. "before" only reports
// the rate: the old prompt rewrites the dates on some runs, not all.
import { buildParsePrompt, parseParsedJson } from '../../src/lib/ai/resume-parse'
import { HAIKU_PARSE_FIELDS } from '../../src/lib/ai/claude'
import { call, pool } from '../model'
import { checkParse } from '../checks'
import { CASES } from '../fixtures'

const [mode, runs] = process.argv.slice(2)
const c = CASES.find((x) => x.id === 'uk-finance-assistant')!
const datesLine = buildParsePrompt('').match(/"dates": "[^"]*"/)![0]
console.log(`${mode}: prompt's job example ${datesLine}`)
const kept = await pool(Array.from({ length: Number(runs) }), 4, async (_, i) => {
  const raw = await call([{ role: 'user', content: buildParsePrompt(c.resumeText) }], { model: HAIKU_PARSE_FIELDS.model, maxTokens: HAIKU_PARSE_FIELDS.max_tokens, label: 'parse' })
  const parsed = parseParsedJson(raw, c.resumeText)
  const fails = checkParse(parsed, c).failures.filter((f) => f.includes('.dates'))
  console.log(`${mode} run ${String(i + 1).padStart(2)}: ${fails.length ? 'REWRITTEN' : 'as written'}  ${parsed.experience.map((e) => e.dates).join(' | ')}`)
  return fails.length === 0
})
const n = kept.filter(Boolean).length
console.log(`${mode}: ${n}/${kept.length} parses kept "09/2022 – Present" and "07/2020 – 08/2022" as written`)
if (mode === 'after' && n !== kept.length) process.exit(1)
