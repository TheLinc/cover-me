// Prompt-sync checker: the AI prompts live in two places (extension for BYOK,
// Supabase Edge Functions for hosted) because the Deno functions can't import
// from the extension tree. This script fails when the shared sections drift —
// it already happened once (the backend tailor shipped without the
// prompt-injection guard the BYOK tailor had).
//
// Run:  node scripts/check-prompt-sync.mjs   (or `pnpm check:prompts` in extension/)
// The extension build runs it automatically.

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const read = (p) => readFileSync(join(ROOT, p), 'utf8').replace(/\r\n/g, '\n')

/** Extract the inclusive substring between two markers; throws if missing. */
function section(content, file, start, end) {
  const s = content.indexOf(start)
  if (s === -1) throw new Error(`${file}: start marker not found: "${start.slice(0, 60)}"`)
  const e = content.indexOf(end, s)
  if (e === -1) throw new Error(`${file}: end marker not found: "${end.slice(0, 60)}"`)
  return content.slice(s, e + end.length)
}

function firstDiff(a, b) {
  const linesA = a.split('\n')
  const linesB = b.split('\n')
  for (let i = 0; i < Math.max(linesA.length, linesB.length); i++) {
    if (linesA[i] !== linesB[i]) {
      return `  line ${i + 1}:\n    A: ${linesA[i] ?? '<missing>'}\n    B: ${linesB[i] ?? '<missing>'}`
    }
  }
  return '  (contents differ but no line-level diff found)'
}

const EXT_LETTER = 'extension/src/lib/ai/index.ts'
const BE_LETTER = 'backend/supabase/functions/generate/index.ts'
const EXT_TAILOR = 'extension/src/lib/ai/resume-tailor.ts'
const BE_TAILOR = 'backend/supabase/functions/tailor/index.ts'
const EXT_LINT = 'extension/src/lib/ai/letter-lint.ts'
const BE_LINT = 'backend/supabase/functions/_shared/letter-lint.ts'

const checks = [
  // The whole letter prompt template must be byte-identical (both files use
  // the same interpolation expressions).
  {
    name: 'letter prompt template',
    a: EXT_LETTER,
    b: BE_LETTER,
    start: 'You are an expert cover letter writer',
    end: 'at most two remain.',
  },
  {
    name: 'letter whyCompany paragraph',
    a: EXT_LETTER,
    b: BE_LETTER,
    start: 'Paragraph 3 — Company Fit',
    end: 'grounded in their experience.',
  },
  {
    name: 'letter supplemental-context block',
    a: EXT_LETTER,
    b: BE_LETTER,
    start: 'SUPPLEMENTAL CANDIDATE CONTEXT (verified by the candidate — real experience, a referral',
    end: 'a claim it does not actually support.',
  },
  // The tailor prompts legitimately differ in shape (raw text vs parsed JSON,
  // fixed vs dynamic schema), so compare each shared section individually.
  {
    name: 'tailor: industry detection + keyword tiering',
    a: EXT_TAILOR,
    b: BE_TAILOR,
    start: 'STEP 1 — DETECT INDUSTRY',
    end: 'Any: cross-functional collaboration, knowledge sharing, process documentation',
  },
  {
    name: 'tailor: alternative requirements + synonyms + angle',
    a: EXT_TAILOR,
    b: BE_TAILOR,
    start: 'ALTERNATIVE REQUIREMENTS',
    end: 'Every bullet and the summary must reinforce it.',
  },
  {
    name: 'tailor: summary step',
    a: EXT_TAILOR,
    b: BE_TAILOR,
    start: 'STEP 4 — WRITE SUMMARY',
    end: 'set summary to "".',
  },
  {
    name: 'tailor: bullet budget + rewrite + reorder steps',
    a: EXT_TAILOR,
    b: BE_TAILOR,
    start: 'STEP 5 — BULLET BUDGET',
    end: 'role order is fixed (Integrity 2).',
  },
  {
    name: 'tailor: skills optimization step',
    a: EXT_TAILOR,
    b: BE_TAILOR,
    start: 'STEP 8 — OPTIMIZE SKILLS',
    end: 'Hard cap: 18 items.',
  },
  {
    name: 'tailor: ATS match report step',
    a: EXT_TAILOR,
    b: BE_TAILOR,
    start: 'STEP 9 — ATS MATCH REPORT',
    end: 'derived entirely from them.',
  },
  {
    name: 'tailor: integrity rules 1–7',
    a: EXT_TAILOR,
    b: BE_TAILOR,
    start: 'INTEGRITY RULES — any violation makes the output unusable',
    end: 'inventing, altering, or deriving one never is.',
  },
  {
    name: 'tailor: final check',
    a: EXT_TAILOR,
    b: BE_TAILOR,
    start: 'FINAL CHECK — before emitting, SILENTLY audit',
    end: 'gaps live only in keywordMatch.',
  },
  {
    name: 'tailor: compact mode block',
    a: EXT_TAILOR,
    b: BE_TAILOR,
    start: 'COMPACT MODE — SINGLE PAGE REQUIRED',
    end: 'omitted in compact mode if space is critical',
  },
  {
    name: 'tailor: revision mode block',
    a: EXT_TAILOR,
    b: BE_TAILOR,
    start: 'REVISION MODE — revise, do not rebuild',
    end: 'shifting the baseline.',
  },
]

let failed = 0

for (const c of checks) {
  try {
    const a = section(read(c.a), c.a, c.start, c.end)
    const b = section(read(c.b), c.b, c.start, c.end)
    if (a === b) {
      console.log(`  ok    ${c.name}`)
    } else {
      failed++
      console.error(`  DRIFT ${c.name}\n    ${c.a}\n    ${c.b}\n${firstDiff(a, b)}`)
    }
  } catch (e) {
    failed++
    console.error(`  ERROR ${c.name}: ${e.message}`)
  }
}

// The lint module mirrors must be byte-identical end to end.
{
  const a = read(EXT_LINT)
  const b = read(BE_LINT)
  if (a === b) {
    console.log('  ok    letter-lint mirror')
  } else {
    failed++
    console.error(`  DRIFT letter-lint mirror\n    ${EXT_LINT}\n    ${BE_LINT}\n${firstDiff(a, b)}`)
  }
}

if (failed > 0) {
  console.error(`\nPrompt sync check FAILED: ${failed} section(s) drifted between extension and backend.`)
  console.error('Apply the same edit to both copies (or copy letter-lint.ts wholesale), then re-run.')
  process.exit(1)
}
console.log('\nPrompt sync check passed — extension and backend prompts are aligned.')
