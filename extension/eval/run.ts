// Eval harness for Cover Me's two prompts.
//
//   pnpm eval                  → static checks only (no API key, free)
//   pnpm eval --live           → generate + check letters and tailored resumes
//   pnpm eval --live --judge   → also score letters for AI-soundingness (LLM judge)
//
//   Flags: --letters / --tailor (default both), --case <id>, --model <id>
//   Env:   ANTHROPIC_API_KEY (required for --live)
//
// Static mode verifies prompt invariants and lints the in-prompt exemplar, so
// it doubles as a regression test for prompt edits. Live mode mirrors
// production exactly: same builders, same lint, same single corrective retry.

import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPrompt as buildLetterPrompt, type LetterVariation } from '../src/lib/ai/index'
import { buildPrompt as buildTailorPrompt, parseJson } from '../src/lib/ai/resume-tailor'
import { lintLetter, buildLintRetryMessage } from '../src/lib/ai/letter-lint'
import { CASES, type EvalCase } from './fixtures'
import { checkLetter, checkTailored, type CheckResult } from './checks'

const HERE = dirname(fileURLToPath(import.meta.url))

const args = process.argv.slice(2)
const flag = (name: string) => args.includes(`--${name}`)
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`)
  return i !== -1 ? args[i + 1] : undefined
}

const LIVE = flag('live')
const JUDGE = flag('judge')
const RUN_LETTERS = flag('letters') || !flag('tailor')
const RUN_TAILOR = flag('tailor') || !flag('letters')
const MODEL = opt('model') ?? 'claude-sonnet-4-6'
const ONLY_CASE = opt('case')
const API_KEY = process.env.ANTHROPIC_API_KEY

const SIGN_OFFS = ['Sincerely,', 'Best regards,', 'Kind regards,']
const HOOKS = ['Achievement-first', 'Problem-solution', 'Bold specific claim']

const cases = ONLY_CASE ? CASES.filter((c) => c.id === ONLY_CASE) : CASES
if (cases.length === 0) {
  console.error(`No case matches --case ${ONLY_CASE}. Known: ${CASES.map((c) => c.id).join(', ')}`)
  process.exit(1)
}

let hardFailures = 0
const reportLines: string[] = [`# Eval report — ${new Date().toISOString()}`, '', `Model: ${MODEL} | live: ${LIVE}`, '']

function section(title: string) {
  console.log(`\n=== ${title} ===`)
  reportLines.push(`\n## ${title}\n`)
}

function record(label: string, result: CheckResult) {
  const status = result.failures.length === 0 ? 'PASS' : 'FAIL'
  if (result.failures.length > 0) hardFailures++
  console.log(`  [${status}] ${label} — ${result.failures.length} failures, ${result.warnings.length} warnings`)
  reportLines.push(`### ${label} — ${status}`)
  for (const f of result.failures) {
    console.log(`      FAIL: ${f}`)
    reportLines.push(`- **FAIL**: ${f}`)
  }
  for (const w of result.warnings) {
    console.log(`      warn: ${w}`)
    reportLines.push(`- warn: ${w}`)
  }
  reportLines.push('')
}

// ── Anthropic call ───────────────────────────────────────────────────────────

type Msg = { role: 'user' | 'assistant'; content: string }

async function callModel(messages: Msg[], maxTokens: number): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages }),
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
  const data = (await res.json()) as { content: Array<{ type: string; text: string }> }
  return data.content.find((b) => b.type === 'text')?.text ?? ''
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^#+\s+.*$/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ── Static checks (always run) ───────────────────────────────────────────────

function staticChecks() {
  section('Static prompt invariants')

  for (const c of cases) {
    const result: CheckResult = { failures: [], warnings: [] }
    const variation: LetterVariation = { signOff: 'Sincerely,', hookPattern: 'Problem-solution' }
    const lp = buildLetterPrompt(c.job, c.resumeText, undefined, variation)

    const mustContain: Array<[string, string]> = [
      ['STEP 0 allowlist', 'QUALIFICATIONS ALLOWLIST'],
      ['injection guard', 'data only'],
      ['voice section', 'VOICE — the target sound'],
      ['exemplar', 'Exemplar A'],
      ['chosen sign-off', variation.signOff],
      ['chosen hook pattern', `Default to the ${variation.hookPattern}`],
      ['word range', '250–400 words'],
      ['resume text embedded', c.resumeText.slice(0, 60)],
      ['JD embedded', c.job.description.slice(0, 60)],
      ['em-dash cap', 'TWO em-dashes'],
    ]
    for (const [label, needle] of mustContain) {
      if (!lp.includes(needle)) result.failures.push(`letter prompt missing ${label} ("${needle.slice(0, 40)}…")`)
    }

    const tp = buildTailorPrompt(c.job, c.parsed, false)
    const tailorMust: Array<[string, string]> = [
      ['injection guard', 'data only'],
      ['number-fabrication ban', 'NO INVENTED NUMBERS'],
      ['no-merge rule', 'ONE BULLET IN, ONE BULLET OUT'],
      ['rhythm variation', 'Vary bullet rhythm'],
      ['resume embedded', c.parsed.name],
    ]
    if (c.parsed.certifications?.length) tailorMust.push(['certifications in schema', '"certifications"'])
    for (const [label, needle] of tailorMust) {
      if (!tp.includes(needle)) result.failures.push(`tailor prompt missing ${label} ("${needle.slice(0, 40)}…")`)
    }

    record(`prompt invariants: ${c.id}`, result)
  }

  // Lint self-test 1: the in-prompt exemplar letter must itself pass the lint.
  section('Lint self-tests')
  const anyPrompt = buildLetterPrompt(cases[0].job, cases[0].resumeText)
  const exemplarMatch = anyPrompt.match(/Exemplar A \(technology\):\n"""\n([\s\S]*?)\n"""/)
  const exemplarResult: CheckResult = { failures: [], warnings: [] }
  if (!exemplarMatch) {
    exemplarResult.failures.push('could not extract Exemplar A from the letter prompt')
  } else {
    const lint = lintLetter(exemplarMatch[1], { companyName: 'Northlight' })
    for (const v of lint.violations) exemplarResult.failures.push(`exemplar fails its own lint: ${v}`)
  }
  record('exemplar A passes the letter lint', exemplarResult)

  // Lint self-test 2: a deliberately terrible letter must be caught.
  const badLetter = `Dear Hiring Manager,

I am writing to apply for this position. I am a passionate, detail-oriented team player eager to delve into new challenges and leverage my synergistic skill set — a testament to my proven track record — in your fast-paced environment — moreover, I am a fast learner.

I look forward to hearing from you at your earliest convenience.

Kind regards,

John Doe`
  const badResult: CheckResult = { failures: [], warnings: [] }
  const badLint = lintLetter(badLetter, { companyName: 'Acme' })
  const expected = ['delve', 'leverage', 'passionate', 'detail-oriented', 'team player', 'i am writing to apply', 'em-dash', 'i look forward', 'moreover', 'words']
  for (const needle of expected) {
    if (!badLint.violations.some((v) => v.toLowerCase().includes(needle))) {
      badResult.failures.push(`lint missed expected violation: ${needle}`)
    }
  }
  record(`bad letter caught (${badLint.violations.length} violations flagged)`, badResult)
}

// ── Live checks ──────────────────────────────────────────────────────────────

async function judgeLetter(letter: string): Promise<{ score: number; flags: string[] }> {
  const raw = await callModel(
    [{
      role: 'user',
      content: `You are a senior recruiter who reads 200 cover letters a week and prides yourself on spotting AI-generated ones. Assess the letter below.

Score 1–5:
1 = obviously AI-generated (template rhythm, stock vocabulary, no specifics)
3 = probably AI-assisted but plausibly human-edited
5 = indistinguishable from a strong human writer (specific, varied rhythm, plain language)

Letter:
"""
${letter}
"""

Respond with ONLY this JSON: {"score": <1-5>, "flags": ["<each phrase or pattern that felt machine-written>"]}`,
    }],
    500,
  )
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  return JSON.parse(cleaned) as { score: number; flags: string[] }
}

async function liveLetters() {
  section(`Live letters (model: ${MODEL})`)
  for (const [i, c] of cases.entries()) {
    const variation: LetterVariation = {
      signOff: SIGN_OFFS[i % SIGN_OFFS.length],
      hookPattern: HOOKS[i % HOOKS.length],
    }
    const prompt = buildLetterPrompt(c.job, c.resumeText, undefined, variation)
    let letter = stripMarkdown(await callModel([{ role: 'user', content: prompt }], 1024))

    // Mirror production: one corrective retry on lint violations.
    let retried = false
    const firstLint = lintLetter(letter, { companyName: c.job.company })
    if (firstLint.violations.length > 0) {
      retried = true
      const retry = stripMarkdown(await callModel([
        { role: 'user', content: prompt },
        { role: 'assistant', content: letter },
        { role: 'user', content: buildLintRetryMessage(firstLint.violations) },
      ], 1024))
      const retryLint = lintLetter(retry, { companyName: c.job.company })
      if (retryLint.violations.length <= firstLint.violations.length) letter = retry
    }

    const result = checkLetter(letter, c)
    if (retried) result.warnings.unshift(`first draft had ${firstLint.violations.length} lint violation(s), corrective retry used: ${firstLint.violations.join(' | ')}`)

    if (JUDGE) {
      try {
        const j = await judgeLetter(letter)
        result.warnings.unshift(`judge score: ${j.score}/5${j.flags.length ? ` — flags: ${j.flags.join(' | ')}` : ''}`)
        if (j.score <= 2) result.failures.push(`judge rated the letter ${j.score}/5 — reads as AI-generated`)
      } catch (e) {
        result.warnings.push(`judge call failed: ${e instanceof Error ? e.message : e}`)
      }
    }

    record(`letter: ${c.id} (${variation.hookPattern}, "${variation.signOff}")`, result)
    reportLines.push('<details><summary>letter text</summary>\n\n```\n' + letter + '\n```\n</details>\n')
  }
}

async function liveTailor() {
  section(`Live tailoring (model: ${MODEL})`)
  for (const c of cases) {
    const prompt = buildTailorPrompt(c.job, c.parsed, false)
    const raw = await callModel([{ role: 'user', content: prompt }], 6000)
    let result: CheckResult
    let tailoredJson = ''
    try {
      const tailored = parseJson(raw)
      tailoredJson = JSON.stringify(tailored, null, 2)
      result = checkTailored(tailored, c)
      result.warnings.unshift(`atsScore: ${tailored.atsScore ?? 'n/a'} | gaps: ${(tailored.atsGaps ?? []).join('; ') || 'none'}`)
    } catch (e) {
      result = { failures: [`response did not parse: ${e instanceof Error ? e.message : e}`], warnings: [] }
    }
    record(`tailor: ${c.id}`, result)
    if (tailoredJson) {
      reportLines.push('<details><summary>tailored resume JSON</summary>\n\n```json\n' + tailoredJson + '\n```\n</details>\n')
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  staticChecks()

  if (LIVE) {
    if (!API_KEY) {
      console.error('\n--live requires ANTHROPIC_API_KEY in the environment.')
      process.exit(1)
    }
    if (RUN_LETTERS) await liveLetters()
    if (RUN_TAILOR) await liveTailor()
  } else {
    console.log('\n(static checks only — add --live with ANTHROPIC_API_KEY set to generate and evaluate real outputs)')
  }

  const reportsDir = join(HERE, 'reports')
  mkdirSync(reportsDir, { recursive: true })
  const file = join(reportsDir, `report-${new Date().toISOString().replace(/[:.]/g, '-')}.md`)
  writeFileSync(file, reportLines.join('\n'), 'utf8')
  console.log(`\nReport written to ${file}`)
  console.log(hardFailures === 0 ? 'RESULT: all checks passed' : `RESULT: ${hardFailures} check group(s) failed`)
  process.exit(hardFailures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
