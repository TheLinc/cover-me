// Deploys migrations and Edge Functions to production (the "CoverMe" Supabase
// project), after the local test suite passes. Day-to-day development runs
// against the local stack (`pnpm start`), so production is the only target.
//
//   pnpm run deploy:prod    (asks you to type "prod" before changing anything)
//
// Flags: --db-only, --functions-only, --skip-tests
//
// Order matters: migrations go first because new function code can depend on
// new columns (see 010_resumes_structured.sql). db push asks for the database
// password unless SUPABASE_DB_PASSWORD is set, and lists the pending
// migrations before applying them.
//
// The project ref is passed explicitly on purpose. The CLI stays linked to the
// paused CoverMe - Dev project, so a stray bare `supabase db push` fails
// instead of reaching production.

import { spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline/promises'
import { BACKEND, supabase } from './lib.mjs'

const PROD_REF = 'ncnmkxzrygnwjiciyxqs'

const FLAGS = ['--db-only', '--functions-only', '--skip-tests']
const flags = process.argv.slice(2)
const unknown = flags.filter((f) => !FLAGS.includes(f))
if (unknown.length || (flags.includes('--db-only') && flags.includes('--functions-only'))) {
  console.error('Usage: pnpm run deploy:prod [--db-only|--functions-only] [--skip-tests]')
  process.exit(1)
}
const has = (f) => flags.includes(f)
const doDb = !has('--functions-only')
const doFunctions = !has('--db-only')

function run(label, fn) {
  console.log(`\n── ${label} ──`)
  const res = fn()
  if (res.status !== 0) {
    console.error(`\n${label} failed. Nothing after this step ran.`)
    process.exit(res.status ?? 1)
  }
}

if (!has('--skip-tests')) {
  run('Local tests (db reset, database tests, integration tests)', () =>
    spawnSync('pnpm', ['test'], { cwd: BACKEND, stdio: 'inherit', shell: process.platform === 'win32' }))
}

const what = [doDb && 'migrations', doFunctions && 'functions'].filter(Boolean).join(' and ')
const rl = createInterface({ input: process.stdin, output: process.stdout })
const answer = await rl.question(`\nDeploy ${what} to PRODUCTION (CoverMe, ${PROD_REF})? Type "prod" to continue: `)
rl.close()
if (answer.trim() !== 'prod') {
  console.log('Cancelled.')
  process.exit(1)
}

if (doDb) {
  run('Migrations → production', () => supabase(['db', 'push', '--project-ref', PROD_REF], { stdio: 'inherit' }))
}
if (doFunctions) {
  run('Edge Functions → production', () => supabase(['functions', 'deploy', '--project-ref', PROD_REF], { stdio: 'inherit' }))
}

console.log('\nDeployed to production.')
