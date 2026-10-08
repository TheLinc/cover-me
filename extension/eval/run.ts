// Eval harness for Cover Me's prompts.
//
//   pnpm eval                                  static checks only (free, no model calls)
//   pnpm eval --live --quick --judge --baseline   the PR check: 9 cases, ~10 min
//   pnpm eval --live --judge --runs 2 --judge-model claude-opus-5-5 --baseline
//                                              the weekly full check: every case
//
//   Flags:
//     --quick                  9 cases, one per field family (PR check)
//     --letters / --tailor     run only one side (default both)
//     --case <id>              one case          --industry <name>  one industry
//     --runs <n>               samples per resume case (default 1)
//     --concurrency <n>        parallel cases (default 6)
//     --via claude|api         claude (default): `claude -p` on your Claude plan;
//                              api: API credits, only when named explicitly. The key
//                              is ANTHROPIC_API_KEY, read from extension/.env or
//                              extension/eval/.env by `pnpm eval`.
//     --no-parse               tailor from the fixture's answer key instead of the
//                              model's parse (isolates tailoring from parsing)
//     --baseline               fail if judge scores drop vs the baseline
//                              (eval/baseline.json with --quick, else baseline-full.json)
//     --update-baseline        write this run's judge scores to that baseline
//     --model / --parse-model / --judge-model <id>
//                              defaults: claude-sonnet-5-5 / claude-haiku-4-5 / claude-sonnet-5-5
//
// Static mode verifies prompt invariants and fixture integrity, so it doubles
// as a regression test for prompt edits. Live mode mirrors production: the
// same prompt builders, parse step, delta merge, lint and corrective retry.
// Every output lands in eval/reports/results-*.json for review.

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ParsedResume, TailoredResume } from '../src/types'
import { buildPrompt as buildLetterPrompt, type LetterVariation } from '../src/lib/ai/index'
import { buildPrompt as buildTailorPrompt, assembleTailored } from '../src/lib/ai/resume-tailor'
import { buildParsePrompt, parseParsedJson } from '../src/lib/ai/resume-parse'
import { lintLetter, buildLintRetryMessage } from '../src/lib/ai/letter-lint'
import { CASES, type EvalCase } from './fixtures'
import { checkFixture, checkLetter, checkParse, checkTailored, type CheckResult } from './checks'
import { buildResumeJudgePrompt, DIMENSIONS, FAIL_AT, parseJudgment, type Dimension, type ResumeJudgment } from './judge'
import { buildClaimCheckPrompt, buildLineCheckPrompt, parseClaimVerdicts, parseLineFlags, type LineRepair } from '../src/lib/ai/resume-grounding'
import { CLAIM_CHECK_MIN, CLAIM_PAIRS } from './claim-pairs'
import { LINE_CHECK_MIN, LINE_ROLES } from './line-pairs'
import { claudeIsolation, makeCaller, planLimitHit, pool, usage, type Backend } from './model'

const HERE = dirname(fileURLToPath(import.meta.url))

const args = process.argv.slice(2)
const flag = (name: string) => args.includes(`--${name}`)
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`)
  return i !== -1 ? args[i + 1] : undefined
}

const LIVE = flag('live')
const JUDGE = flag('judge')
const QUICK = flag('quick')
const RUN_LETTERS = flag('letters') || !flag('tailor')
const RUN_TAILOR = flag('tailor') || !flag('letters')
const MODEL = opt('model') ?? 'claude-sonnet-5-5'
const PARSE_MODEL = opt('parse-model') ?? 'claude-haiku-4-5'
const JUDGE_MODEL = opt('judge-model') ?? 'claude-sonnet-5-5'
const RUNS = Math.max(1, Number(opt('runs') ?? 1))
const CONCURRENCY = Math.max(1, Number(opt('concurrency') ?? 6))
// API credits only when asked for by name: an ANTHROPIC_API_KEY in the shell
// must never switch the eval off the Claude plan.
const VIA = (opt('via') ?? 'claude') as Backend
const USE_PARSE = !flag('no-parse')
const ONLY_CASE = opt('case')
const ONLY_INDUSTRY = opt('industry')?.toLowerCase()
// The PR gate and the weekly full run keep separate baselines: different case
// sets and judges give scores that can't be compared.
const BASELINE_FILE = join(HERE, QUICK ? 'baseline.json' : 'baseline-full.json')

const SIGN_OFFS = ['Sincerely,', 'Best regards,', 'Kind regards,']
const HOOKS = ['Achievement-first', 'Problem-solution', 'Bold specific claim']

// A low judge score fails a plain run. Under --baseline (the CI gate) it is a
// warning: the gate fails on drops against the baseline and on the factual
// checks (invented terms, lint, integrity), so it isn't red on every PR while
// overall quality is still being raised.
const judgeFloor = (r: { failures: string[]; warnings: string[] }) => (flag('baseline') ? r.warnings : r.failures)

// --quick: one case per field family plus the prompt-injection case, for the
// PR check. The full set runs weekly.
const QUICK_CASES = [
  'tech-prompt-injection', 'new-grad-data-analyst', 'nurse-missing-certs',
  'sales-ae-midmarket-to-enterprise', 'uk-finance-assistant', 'teacher-to-instructional-designer',
  'welder-structural-to-pipe', 'line-cook-to-sous-chef', 'veteran-to-distribution-ops',
]

const cases = CASES.filter((c) =>
  (!QUICK || QUICK_CASES.includes(c.id)) &&
  (!ONLY_CASE || c.id === ONLY_CASE) && (!ONLY_INDUSTRY || c.industry.toLowerCase() === ONLY_INDUSTRY))
if (QUICK && cases.length !== QUICK_CASES.length && !ONLY_CASE && !ONLY_INDUSTRY) {
  console.error(`--quick lists cases that no longer exist: ${QUICK_CASES.filter((id) => !CASES.some((c) => c.id === id)).join(', ')}`)
  process.exit(1)
}
if (cases.length === 0) {
  console.error(`No case matches. Cases: ${CASES.map((c) => c.id).join(', ')}\nIndustries: ${[...new Set(CASES.map((c) => c.industry))].join(', ')}`)
  process.exit(1)
}

const call = makeCaller(VIA)

let hardFailures = 0
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const reportLines: string[] = [
  `# Eval report — ${new Date().toISOString()}`, '',
  `Tailor/letter model: ${MODEL} | parse: ${PARSE_MODEL} | judge: ${JUDGE_MODEL} | via: ${VIA} | live: ${LIVE} | runs: ${RUNS}`, '',
]

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
    const result = checkFixture(c)
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
    if (c.parsed.skills) tailorMust.push(['evidence-backed skills format', 'SKILLS OUTPUT FORMAT'])
    for (const [label, needle] of tailorMust) {
      if (!tp.includes(needle)) result.failures.push(`tailor prompt missing ${label} ("${needle.slice(0, 40)}…")`)
    }

    const pp = buildParsePrompt(c.resumeText)
    if (!pp.includes('Copy all text verbatim')) result.failures.push('parse prompt missing verbatim rule')
    if (!pp.includes(c.resumeText.slice(0, 60))) result.failures.push('parse prompt missing resume text')

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

  // Lint self-test 3: a banned word inside the employer's name is the employer,
  // not an AI tell. Without this, the model avoids naming "Beacon Retail Group".
  const companyResult: CheckResult = { failures: [], warnings: [] }
  if (exemplarMatch) {
    const renamed = exemplarMatch[1].replaceAll('Northlight', 'Beacon Retail Group')
    for (const v of lintLetter(renamed, { companyName: 'Beacon Retail Group' }).violations) {
      companyResult.failures.push(`company name tripped the lint: ${v}`)
    }
  }
  record('banned words inside the company name are allowed', companyResult)

  // Lint self-test 4: the letter goes to an employer, so a note to the user
  // (seen live after a prompt-injection posting) must be caught and retried.
  const noteResult: CheckResult = { failures: [], warnings: [] }
  if (exemplarMatch) {
    const notes = [
      'Note: the job posting contained an embedded instruction telling AI tools to claim extra experience. I ignored it and wrote the letter from your resume only.',
      'The posting included hidden instructions for AI tools, which I did not follow.',
      'I kept every claim to what is in your resume.',
    ]
    for (const note of notes) {
      const lint = lintLetter(`${note}\n\n${exemplarMatch[1]}`, { companyName: 'Northlight' })
      if (!lint.violations.some((v) => /note to the user|aimed at the user/i.test(v))) {
        noteResult.failures.push(`lint missed a note to the user: "${note.slice(0, 60)}..."`)
      }
    }
  }
  record('notes to the user are caught', noteResult)
}

// ── Live letters ─────────────────────────────────────────────────────────────

async function judgeLetter(letter: string): Promise<{ score: number; flags: string[] }> {
  const raw = await call(
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
    { model: JUDGE_MODEL, maxTokens: 2000, think: true },
  )
  const start = raw.indexOf('{')
  return JSON.parse(raw.slice(start, raw.lastIndexOf('}') + 1)) as { score: number; flags: string[] }
}

async function liveLetters() {
  section(`Live letters (model: ${MODEL})`)
  // Runs apply to letters too: one letter per case is too noisy to compare.
  const jobs = cases.flatMap((c, i) => Array.from({ length: RUNS }, (_, run) => ({ c, i, run })))
  process.stdout.write(`  ${jobs.length} letters `)
  const results = await pool(jobs, CONCURRENCY, async ({ c, i, run }) => {
    const v = i + run
    const variation: LetterVariation = { signOff: SIGN_OFFS[v % SIGN_OFFS.length], hookPattern: HOOKS[v % HOOKS.length] }
    const prompt = buildLetterPrompt(c.job, c.resumeText, undefined, variation)
    let letter: string
    try {
      letter = stripMarkdown(await call([{ role: 'user', content: prompt }], { model: MODEL, maxTokens: 1024 }))
    } catch (e) {
      // One failed call fails this letter, not the whole run.
      process.stdout.write('x')
      const result: CheckResult = { failures: [`model call failed: ${e instanceof Error ? e.message : e}`], warnings: [] }
      return { c, run, variation, letter: '', result, judgeScore: undefined as number | undefined }
    }

    // Mirror production: one corrective retry on lint violations. A failed
    // retry keeps the draft, as production does.
    let retried = false
    const firstLint = lintLetter(letter, { companyName: c.job.company })
    if (firstLint.violations.length > 0) {
      retried = true
      try {
        const retry = stripMarkdown(await call([
          { role: 'user', content: prompt },
          { role: 'assistant', content: letter },
          { role: 'user', content: buildLintRetryMessage(firstLint.violations) },
        ], { model: MODEL, maxTokens: 1024 }))
        const retryLint = lintLetter(retry, { companyName: c.job.company })
        if (retryLint.violations.length <= firstLint.violations.length) letter = retry
      } catch {
        // keep the draft
      }
    }

    const result = checkLetter(letter, c)
    if (retried) result.warnings.unshift(`first draft had ${firstLint.violations.length} lint violation(s), corrective retry used: ${firstLint.violations.join(' | ')}`)
    let judgeScore: number | undefined
    if (JUDGE) {
      try {
        const j = await judgeLetter(letter)
        judgeScore = j.score
        result.warnings.unshift(`judge score: ${j.score}/5${j.flags.length ? ` — flags: ${j.flags.join(' | ')}` : ''}`)
        if (j.score <= 2) judgeFloor(result).push(`judge rated the letter ${j.score}/5 — reads as AI-generated`)
      } catch (e) {
        result.warnings.push(`judge call failed: ${e instanceof Error ? e.message : e}`)
      }
    }
    process.stdout.write('.')
    return { c, run, variation, letter, result, judgeScore }
  })
  console.log('')
  for (const { c, run, variation, letter, result } of results) {
    const suffix = RUNS > 1 ? ` (run ${run + 1})` : ''
    record(`letter: ${c.id}${suffix} (${variation.hookPattern}, "${variation.signOff}")`, result)
    reportLines.push('<details><summary>letter text</summary>\n\n```\n' + letter + '\n```\n</details>\n')
  }
  return results.map(({ c, run, letter, result, judgeScore }) => ({ id: c.id, run, letter, judgeScore, failures: result.failures, warnings: result.warnings }))
}

// ── Live resume pipeline: parse → tailor → checks → judge ────────────────────

interface TailorRun {
  id: string
  industry: string
  run: number
  parse?: { result: CheckResult; parsed?: ParsedResume }
  tailor: CheckResult
  tailored?: TailoredResume
  /** The tailor's raw output, including each skill's cited evidence, for review. */
  raw?: string
  /** Job-only terms the production grounding guard stripped from the model's output. */
  guardRemoved?: string[]
  /** What the production line check flagged, rewrote, or reverted. */
  lines?: LineRepair
  /** Expected category labels (EvalCase.expectedLabels) the final skills list did or didn't include. */
  connections?: { made: string[]; missed: string[] }
  judgment?: ResumeJudgment
  error?: string
}

async function tailorOnce(c: EvalCase, run: number): Promise<TailorRun> {
  const out: TailorRun = { id: c.id, industry: c.industry, run, tailor: { failures: [], warnings: [] } }
  try {
    // 1. Parse the raw resume text, as the hosted tier does on first tailor.
    let input: ParsedResume = c.parsed
    if (USE_PARSE) {
      const raw = await call([{ role: 'user', content: buildParsePrompt(c.resumeText) }], { model: PARSE_MODEL, maxTokens: 3000, label: 'parse' })
      try {
        const parsed = parseParsedJson(raw)
        const result = checkParse(parsed, c)
        out.parse = { result, parsed }
        // A bad parse would make every tailor check fail for the wrong reason,
        // so tailor from the answer key and report the parse failure separately.
        if (result.failures.length === 0) input = parsed
      } catch (e) {
        out.parse = { result: { failures: [`parse output unusable: ${e instanceof Error ? e.message : e}`], warnings: [] } }
      }
    }

    // 2. Tailor, exactly as production does (delta → merge → code-computed ATS).
    const raw = await call([{ role: 'user', content: buildTailorPrompt(c.job, input, false) }], { model: MODEL, maxTokens: 6000, label: 'tailor' })
    out.raw = raw
    try {
      let guarded: string[] = []
      const stepOf = (prompt: string) =>
        prompt.startsWith('SKILL CLAIM CHECK') ? 'skill check' : prompt.startsWith('RESUME ACCURACY CHECK') ? 'line check' : 'line rewrite'
      const ask = (prompt: string) => call([{ role: 'user', content: prompt }], { model: MODEL, maxTokens: 2000, label: stepOf(prompt) })
      const onLineRepair = (repair: LineRepair) => (out.lines = repair)
      const tailored = await assembleTailored(input, raw, { jobDescription: c.job.description, ask, onLineRepair }, (removed) => (guarded = removed))
      out.tailored = tailored
      out.guardRemoved = guarded
      out.tailor = checkTailored(tailored, c, input)
      out.tailor.warnings.unshift(`atsScore: ${tailored.atsScore ?? 'n/a'} | gaps: ${(tailored.atsGaps ?? []).join('; ') || 'none'}`)
      if (guarded.length) out.tailor.warnings.push(`grounding guard removed: ${guarded.join(', ')}`)
      if (out.lines?.checkFailed) out.tailor.warnings.push('line check failed to run; tailoring kept unchecked')
      else if (out.lines?.flagged.length) out.tailor.warnings.push(`line check: ${out.lines.rewritten} rewritten, ${out.lines.reverted} reverted — ${out.lines.flagged.join(' | ')}`)
      if (c.expectedLabels?.length) {
        const skills = (tailored.skills ?? '').toLowerCase()
        const made: string[] = []
        const missed: string[] = []
        for (const options of c.expectedLabels) {
          const hit = options.find((o) => skills.includes(o.toLowerCase()))
          if (hit) made.push(hit)
          else missed.push(options[0])
        }
        out.connections = { made, missed }
        out.tailor.warnings.push(`connections: ${made.length}/${c.expectedLabels.length}${missed.length ? ` (missed: ${missed.join(', ')})` : ''}`)
      }

      // 3. Judge field fit and quality.
      if (JUDGE) {
        const jraw = await call([{ role: 'user', content: buildResumeJudgePrompt(c, input, tailored) }], { model: JUDGE_MODEL, maxTokens: 4000, think: true, label: 'judge' })
        const j = parseJudgment(jraw)
        out.judgment = j
        const scores = DIMENSIONS.map((d) => `${d} ${j[d]}`).join(', ')
        out.tailor.warnings.unshift(`judge: ${scores}${j.issues.length ? ` — ${j.issues.join(' | ')}` : ''}`)
        for (const d of DIMENSIONS) {
          if (j[d] <= FAIL_AT) judgeFloor(out.tailor).push(`judge scored ${d} ${j[d]}/5`)
        }
      }
    } catch (e) {
      out.tailor.failures.push(`tailor output unusable: ${e instanceof Error ? e.message : e}`)
    }
  } catch (e) {
    out.error = e instanceof Error ? e.message : String(e)
    out.tailor.failures.push(`model call failed: ${out.error}`)
  }
  process.stdout.write('.')
  return out
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN
}

type Averages = Record<string, Record<Dimension, number>>
interface Baseline {
  scores: Averages
  connectionRate?: number
  /** Letter judge score (1 to 5) per case. */
  letters?: Record<string, number>
  model?: string
  judge?: string
}

/** Share of expected category labels the tailor added, across every run that has any. */
function connectionRate(runs: TailorRun[]): number | undefined {
  const made = runs.reduce((n, r) => n + (r.connections?.made.length ?? 0), 0)
  const total = runs.reduce((n, r) => n + (r.connections ? r.connections.made.length + r.connections.missed.length : 0), 0)
  return total ? Math.round((made / total) * 100) / 100 : undefined
}

function judgeAverages(runs: TailorRun[]): Averages {
  const out: Averages = {}
  for (const id of [...new Set(runs.map((r) => r.id))]) {
    const js = runs.filter((r) => r.id === id && r.judgment).map((r) => r.judgment!)
    if (!js.length) continue
    out[id] = Object.fromEntries(DIMENSIONS.map((d) => [d, Math.round(mean(js.map((j) => j[d])) * 100) / 100])) as Record<Dimension, number>
  }
  return out
}

async function liveTailor(): Promise<TailorRun[]> {
  section(`Live tailoring (model: ${MODEL}, parse: ${USE_PARSE ? PARSE_MODEL : 'off'}${JUDGE ? `, judge: ${JUDGE_MODEL}` : ''})`)
  const jobs = cases.flatMap((c) => Array.from({ length: RUNS }, (_, run) => ({ c, run })))
  process.stdout.write(`  ${jobs.length} runs `)
  const runs = await pool(jobs, CONCURRENCY, ({ c, run }) => tailorOnce(c, run))
  console.log('')

  for (const r of runs) {
    const suffix = RUNS > 1 ? ` (run ${r.run + 1})` : ''
    if (r.parse) record(`parse: ${r.id}${suffix}`, r.parse.result)
    record(`tailor: ${r.id}${suffix}`, r.tailor)
    if (r.tailored) reportLines.push('<details><summary>tailored resume JSON</summary>\n\n```json\n' + JSON.stringify(r.tailored, null, 2) + '\n```\n</details>\n')
  }

  // Production cost per tailor, by step (list prices; claude -p adds ~230 input
  // tokens of its own per call, so these read slightly high).
  const perTailor = runs.length
  const costRows = ['| Step | Calls | Avg input | Avg output | Cost per tailor |', '|---|---|---|---|---|']
  for (const step of ['parse', 'tailor', 'skill check', 'line check', 'line rewrite']) {
    const es = usage.log.filter((e) => e.label === step)
    if (!es.length) continue
    const [pin, pout] = step === 'parse' ? [1, 5] : [3, 15]
    const cost = es.reduce((n, e) => n + (e.input * pin + e.output * pout) / 1e6, 0) / perTailor
    costRows.push(`| ${step} | ${es.length} | ${Math.round(mean(es.map((e) => e.input)))} | ${Math.round(mean(es.map((e) => e.output)))} | $${cost.toFixed(4)} |`)
  }
  reportLines.push('\n## Production cost per tailor\n', ...costRows, '')
  console.log('\n' + costRows.join('\n'))

  // Industry summary table.
  const avgs = judgeAverages(runs)
  const table = ['| Industry | Case | Parse | Integrity | Faithful | Field fit | Relevance | Readability | ATS | Links |', '|---|---|---|---|---|---|---|---|---|---|']
  for (const c of cases) {
    const rs = runs.filter((r) => r.id === c.id)
    const parseOk = rs.every((r) => !r.parse || r.parse.result.failures.length === 0)
    const tailorOk = rs.every((r) => r.tailor.failures.filter((f) => !f.startsWith('judge scored')).length === 0)
    const a = avgs[c.id]
    const ats = mean(rs.map((r) => r.tailored?.atsScore).filter((n): n is number => typeof n === 'number'))
    const links = rs.filter((r) => r.connections)
    const linkCell = links.length ? `${links.reduce((n, r) => n + r.connections!.made.length, 0)}/${links.reduce((n, r) => n + r.connections!.made.length + r.connections!.missed.length, 0)}` : '-'
    table.push(`| ${c.industry} | ${c.id} | ${USE_PARSE ? (parseOk ? 'pass' : '**FAIL**') : 'skipped'} | ${tailorOk ? 'pass' : '**FAIL**'} | ${DIMENSIONS.map((d) => (a ? a[d].toFixed(1) : '-')).join(' | ')} | ${Number.isNaN(ats) ? '-' : Math.round(ats)} | ${linkCell} |`)
  }
  const rate = connectionRate(runs)
  const rateLine = rate === undefined ? '' : `Skill connections made (expected category labels added from resume evidence): ${Math.round(rate * 100)}%`
  reportLines.splice(4, 0, '## Summary', '', ...table, '', rateLine, '')
  console.log('\n' + table.join('\n') + (rateLine ? `\n\n${rateLine}` : ''))
  return runs
}

// ── Baseline ─────────────────────────────────────────────────────────────────
// A real regression is a sustained drop, not one noisy score: the gate is an
// average falling 0.5 or more. Scores from a different judge model aren't
// comparable, so a judge mismatch fails loudly.

function baselineStep(letterScores: Record<string, number>, runs: TailorRun[]) {
  const avgs = runs.length ? judgeAverages(runs) : {}
  const rate = runs.length ? connectionRate(runs) : undefined
  const name = BASELINE_FILE.split(/[\\/]/).pop()

  if (flag('baseline')) {
    if (!existsSync(BASELINE_FILE)) {
      console.log(`\n(no eval/${name} yet; run with --update-baseline to create one)`)
    } else {
      const base = JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) as Baseline
      const result: CheckResult = { failures: [], warnings: [] }
      if (base.judge && base.judge !== JUDGE_MODEL) {
        result.failures.push(`eval/${name} was judged by ${base.judge} but this run used ${JUDGE_MODEL}; scores aren't comparable. Re-run with --update-baseline.`)
      } else {
        if (rate !== undefined && base.connectionRate !== undefined) {
          const drop = base.connectionRate - rate
          if (drop >= 0.3) result.failures.push(`skill connections fell ${base.connectionRate} → ${rate}`)
          else if (drop >= 0.15) result.warnings.push(`skill connections dipped ${base.connectionRate} → ${rate}`)
        }
        // One sample per case swings by a point between runs, so the gate is the
        // average across cases per dimension; single-case drops are warnings.
        const sharedIds = Object.keys(avgs).filter((id) => base.scores[id])
        for (const d of DIMENSIONS) {
          if (!sharedIds.length) break
          const was = mean(sharedIds.map((id) => base.scores[id][d]))
          const now = mean(sharedIds.map((id) => avgs[id][d]))
          if (was - now >= 0.5) result.failures.push(`average ${d} fell ${was.toFixed(2)} → ${now.toFixed(2)}`)
          for (const id of sharedIds) {
            if (base.scores[id][d] - avgs[id][d] >= 1) result.warnings.push(`${id}: ${d} fell ${base.scores[id][d]} → ${avgs[id][d]}`)
          }
        }
        const shared = Object.keys(letterScores).filter((id) => base.letters?.[id] !== undefined)
        if (shared.length) {
          const was = mean(shared.map((id) => base.letters![id]))
          const now = mean(shared.map((id) => letterScores[id]))
          if (was - now >= 0.5) result.failures.push(`average letter score fell ${was.toFixed(2)} → ${now.toFixed(2)}`)
          for (const id of shared) {
            if (base.letters![id] - letterScores[id] >= 2) result.warnings.push(`${id}: letter score fell ${base.letters![id]} → ${letterScores[id]}`)
          }
        }
      }
      record('judge scores and skill connections vs baseline', result)
    }
  }
  if (flag('update-baseline')) {
    const existing: Baseline = existsSync(BASELINE_FILE) ? JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) : { scores: {} }
    writeFileSync(BASELINE_FILE, JSON.stringify({
      updated: new Date().toISOString(), model: MODEL, judge: JUDGE_MODEL, runs: RUNS,
      connectionRate: rate ?? existing.connectionRate,
      letters: { ...existing.letters, ...letterScores },
      scores: { ...existing.scores, ...avgs },
    }, null, 2) + '\n')
    console.log(`\nBaseline updated: ${BASELINE_FILE}`)
  }
}

// ── Skill-claim checker accuracy ─────────────────────────────────────────────
// The production pair check decides which added skill labels survive. Run it
// over hand-labeled pairs, in batches of 5 like production calls.

async function claimChecker(): Promise<{ correct: number; total: number }> {
  section(`Skill-claim checker (model: ${MODEL})`)
  const batches: number[][] = []
  for (let i = 0; i < CLAIM_PAIRS.length; i += 5) batches.push(CLAIM_PAIRS.slice(i, i + 5).map((_, k) => i + k))
  const verdict = new Array<boolean>(CLAIM_PAIRS.length)
  await pool(batches, CONCURRENCY, async (b) => {
    const prompt = buildClaimCheckPrompt(b.map((i) => ({ skill: CLAIM_PAIRS[i].skill, evidence: CLAIM_PAIRS[i].evidence })))
    const ok = parseClaimVerdicts(await call([{ role: 'user', content: prompt }], { model: MODEL, maxTokens: 1000 }), b.length)
    b.forEach((i, k) => (verdict[i] = ok[k]))
  })
  const result: CheckResult = { failures: [], warnings: [] }
  const wrongReject = CLAIM_PAIRS.filter((p, i) => p.ok && !verdict[i]).map((p) => `${p.skill} <- "${p.evidence}"`)
  const wrongAccept = CLAIM_PAIRS.filter((p, i) => !p.ok && verdict[i]).map((p) => `${p.skill} <- "${p.evidence}"`)
  const correct = CLAIM_PAIRS.length - wrongReject.length - wrongAccept.length
  if (wrongReject.length) result.warnings.push(`honest connections rejected: ${wrongReject.join(' | ')}`)
  if (wrongAccept.length) result.warnings.push(`inflated labels accepted: ${wrongAccept.join(' | ')}`)
  if (correct / CLAIM_PAIRS.length < CLAIM_CHECK_MIN) result.failures.push(`checker accuracy ${correct}/${CLAIM_PAIRS.length} is below ${CLAIM_CHECK_MIN * 100}%`)
  record(`skill-claim checker: ${correct}/${CLAIM_PAIRS.length} correct`, result)
  return { correct, total: CLAIM_PAIRS.length }
}

// The production line check decides which rewritten bullets get rewritten
// again. Run it over hand-labeled roles, one role per call.
async function lineChecker(): Promise<{ correct: number; total: number }> {
  section(`Line checker (model: ${MODEL})`)
  let correct = 0
  let total = 0
  const result: CheckResult = { failures: [], warnings: [] }
  const missed: string[] = []
  const wrong: string[] = []
  await pool(LINE_ROLES, CONCURRENCY, async (r) => {
    const original = { experience: [{ title: r.title, company: r.company, bullets: r.original }] }
    const tailored = { summary: '', experience: [{ title: r.title, company: r.company, bullets: r.rewritten }] }
    const flags = parseLineFlags(await call([{ role: 'user', content: buildLineCheckPrompt(original, tailored) }], { model: MODEL, maxTokens: 2000 }))
    if (!flags) {
      result.failures.push(`${r.id}: check reply could not be read`)
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
  if (total && correct / total < LINE_CHECK_MIN) result.failures.push(`line check accuracy ${correct}/${total} is below ${LINE_CHECK_MIN * 100}%`)
  record(`line checker: ${correct}/${total} correct`, result)
  return { correct, total }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  staticChecks()

  let letters: Awaited<ReturnType<typeof liveLetters>> = []
  let tailorRuns: TailorRun[] = []
  if (LIVE) {
    if (VIA === 'api' && !process.env.ANTHROPIC_API_KEY) {
      console.error('\n--via api requires ANTHROPIC_API_KEY. Use --via claude to run on your Claude plan.')
      process.exit(1)
    }
    console.log(`\nBackend: ${VIA}${VIA === 'claude' ? ` — ${claudeIsolation()}` : ''}`)
    reportLines.push(`Backend: ${VIA}${VIA === 'claude' ? ` — ${claudeIsolation()}` : ''}`, '')
    if (RUN_LETTERS) letters = await liveLetters()
    if (RUN_TAILOR) {
      const checker = await claimChecker()
      const lines = await lineChecker()
      reportLines.splice(3, 0, `Skill-claim checker: ${checker.correct}/${checker.total} hand-labeled pairs correct | Line checker: ${lines.correct}/${lines.total} hand-labeled lines correct`, '')
      tailorRuns = await liveTailor()
    }
    if (JUDGE) {
      // Mean judge score per case across runs.
      const scored = letters.filter((l) => l.judgeScore !== undefined)
      const letterScores = Object.fromEntries([...new Set(scored.map((l) => l.id))].map((id) => [
        id, mean(scored.filter((l) => l.id === id).map((l) => l.judgeScore as number)),
      ]))
      baselineStep(letterScores, tailorRuns)
    }
    const costLine = `Model calls: ${usage.calls} | tokens in/out: ${usage.inputTokens}/${usage.outputTokens} | API-equivalent cost: $${usage.costUsd.toFixed(2)}${VIA === 'claude' ? ' (billed to your Claude plan, not API credits)' : ''}`
    console.log(`\n${costLine}`)
    reportLines.splice(3, 0, costLine, '')
  } else {
    console.log('\n(static checks only — add --live to generate and evaluate real outputs; runs on your Claude plan via `claude -p`; add --quick for the 9-case PR set)')
  }

  const reportsDir = join(HERE, 'reports')
  mkdirSync(reportsDir, { recursive: true })
  const file = join(reportsDir, `report-${stamp}.md`)
  writeFileSync(file, reportLines.join('\n'), 'utf8')
  if (LIVE) {
    const resultsFile = join(reportsDir, `results-${stamp}.json`)
    writeFileSync(resultsFile, JSON.stringify({ model: MODEL, parseModel: PARSE_MODEL, judgeModel: JUDGE_MODEL, via: VIA, runs: RUNS, letters, tailor: tailorRuns }, null, 2))
    console.log(`Outputs written to ${resultsFile}`)
  }
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, reportLines.slice(0, 60).join('\n') + '\n')
  console.log(`Report written to ${file}`)
  if (planLimitHit()) {
    console.error(`RESULT: INCOMPLETE. The Claude plan limit was hit (${planLimitHit()}); outputs after that point are failures, not scores. Re-run after the reset.`)
    process.exit(1)
  }
  console.log(hardFailures === 0 ? 'RESULT: all checks passed' : `RESULT: ${hardFailures} check group(s) failed`)
  process.exit(hardFailures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
