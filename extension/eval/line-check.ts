import { buildLineCheckPrompt, parseLineFlags } from '../src/lib/ai/resume-grounding'
import type { CheckResult } from './checks'
import { LINE_CHECK_MIN, LINE_ROLES } from './line-pairs'
import { pool } from './model'

// One role per call, as production sends them (https://github.com/TheLinc/cover-me/commit/48b8913).
export async function checkLines(ask: (prompt: string) => Promise<string>, concurrency: number): Promise<{ correct: number; total: number; result: CheckResult }> {
  let correct = 0
  let total = 0
  let unreadable = 0
  const result: CheckResult = { failures: [], warnings: [] }
  const missed: string[] = []
  const wrong: string[] = []
  await pool(LINE_ROLES, concurrency, async (r) => {
    const original = { experience: [{ title: r.title, company: r.company, bullets: r.original }] }
    const tailored = { summary: '', experience: [{ title: r.title, company: r.company, bullets: r.rewritten }] }
    const prompt = buildLineCheckPrompt(original, tailored)
    const first = await ask(prompt)
    let flags = parseLineFlags(first)
    let retry = ''
    if (!flags) {
      retry = await ask(prompt)
      flags = parseLineFlags(retry)
    }
    // Production keeps the tailored resume when the reply can't be read (#366).
    if (!flags) {
      unreadable++
      result.warnings.push(`${r.id}: check reply could not be read, twice: ${JSON.stringify(first.slice(0, 300))} then ${JSON.stringify(retry.slice(0, 300))}`)
      return
    }
    for (const k of r.flag) {
      total++
      if (flags.has(`e0b${k}`)) correct++
      else missed.push(`${r.id}: "${r.rewritten[k]}"`)
    }
    for (const k of r.ok) {
      total++
      if (!flags.has(`e0b${k}`)) correct++
      else wrong.push(`${r.id}: "${r.rewritten[k]}" (${flags.get(`e0b${k}`)})`)
    }
  })
  if (missed.length) result.warnings.push(`inflation missed: ${missed.join(' | ')}`)
  if (wrong.length) result.warnings.push(`faithful lines flagged: ${wrong.join(' | ')}`)
  // CI saw up to 2 of 12 flaky replies a run; more means the prompt stopped getting JSON back (#366).
  if (unreadable * 4 > LINE_ROLES.length) result.failures.push(`${unreadable} of ${LINE_ROLES.length} roles got no readable check reply`)
  if (total && correct / total < LINE_CHECK_MIN) result.failures.push(`line check accuracy ${correct}/${total} is below ${LINE_CHECK_MIN * 100}%`)
  return { correct, total, result }
}
