// Runs the integration tests (tests/integration) against the local stack:
//   1. writes supabase/functions/.env.test (local keys, throwaway ENCRYPTION_KEY,
//      ANTHROPIC_BASE_URL pointed at the mock server vitest starts)
//   2. serves the functions with that env file
//   3. runs vitest, then stops the functions
//
// Usage: pnpm test:functions [vitest args], e.g. pnpm test:functions tailor
// Stops any running `pnpm functions:serve`; restart it afterwards.

import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { BACKEND, killTree, localStatus, publishableKey, serviceKey, supabaseAsync } from './lib.mjs'

const MOCK_PORT = process.env.MOCK_ANTHROPIC_PORT ?? '54399'
const status = localStatus()

const envFile = join(BACKEND, 'supabase', 'functions', '.env.test')
writeFileSync(envFile, [
  `SERVICE_KEY=${serviceKey(status)}`,
  `ENCRYPTION_KEY=${randomBytes(32).toString('hex')}`,
  'ANTHROPIC_API_KEY=mock-key',
  `ANTHROPIC_BASE_URL=http://host.docker.internal:${MOCK_PORT}`,
  'DEBUG_MODE=false',
].join('\n') + '\n')

console.log('Serving functions with the test env…')
const serve = supabaseAsync(['functions', 'serve', '--env-file', envFile], { stdio: ['ignore', 'pipe', 'pipe'] })
let serveLog = ''
serve.stdout.on('data', (d) => (serveLog += d))
serve.stderr.on('data', (d) => (serveLog += d))

const cleanup = () => killTree(serve)
process.on('SIGINT', () => { cleanup(); process.exit(130) })

// Ready when a function itself answers: the gateway accepts the legacy anon
// JWT, then the function rejects it as a user token with its own JSON body.
async function waitForFunctions(timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (serve.exitCode !== null) break
    try {
      const res = await fetch(`${status.API_URL}/functions/v1/resume`, {
        headers: { Authorization: `Bearer ${status.ANON_KEY}`, apikey: status.ANON_KEY },
      })
      if (res.status === 401 && (await res.text()).includes('Invalid token')) return
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 1000))
  }
  cleanup()
  console.error('Functions did not start. `supabase functions serve` output:\n' + serveLog)
  process.exit(1)
}

await waitForFunctions()

const vitest = spawnSync(
  join(BACKEND, 'node_modules', '.bin', process.platform === 'win32' ? 'vitest.cmd' : 'vitest'),
  ['run', ...process.argv.slice(2)],
  {
    cwd: BACKEND,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      SUPABASE_API_URL: status.API_URL,
      SUPABASE_PUBLISHABLE_KEY: publishableKey(status),
      SUPABASE_SERVICE_KEY: serviceKey(status),
      MOCK_ANTHROPIC_PORT: MOCK_PORT,
    },
  },
)

cleanup()
if (vitest.status !== 0 && process.env.SHOW_FUNCTION_LOGS !== '0') {
  console.log('\n── supabase functions serve output ──\n' + serveLog.slice(-8000))
}
process.exit(vitest.status ?? 1)
