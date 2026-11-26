import { spawn, spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'

export const BACKEND = join(dirname(fileURLToPath(import.meta.url)), '..')
// Production ("CoverMe") is always named explicitly, since the CLI stays
// linked to the paused CoverMe - Dev project (https://github.com/TheLinc/cover-me/commit/f2256d02).
export const PROD_REF = 'ncnmkxzrygnwjiciyxqs'
export const REPO = join(BACKEND, '..')

const isWindows = process.platform === 'win32'
// Run with node, not the .cmd shim, so no shell mangles arguments such as a
// db URL with a password (https://github.com/TheLinc/cover-me/commit/f2256d02).
const SUPABASE_JS = join(BACKEND, 'node_modules', 'supabase', 'dist', 'supabase.js')

export function supabase(args, opts = {}) {
  return spawnSync(process.execPath, [SUPABASE_JS, ...args], { cwd: BACKEND, encoding: 'utf8', ...opts })
}

export function supabaseAsync(args, opts = {}) {
  return spawn(process.execPath, [SUPABASE_JS, ...args], { cwd: BACKEND, ...opts })
}

export function localStatus() {
  const res = supabase(['status', '-o', 'env'])
  if (res.status !== 0) {
    console.error('The local Supabase stack is not running. Start it with `pnpm start` in backend/.')
    process.exit(1)
  }
  const out = {}
  for (const line of res.stdout.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)="?(.*?)"?$/)
    if (m) out[m[1]] = m[2]
  }
  return out
}

// The hosted projects use the new-style secret key, so the functions' SERVICE_KEY
// is that one when the stack has it, else the legacy service_role JWT (https://github.com/TheLinc/cover-me/commit/f2256d02).
export function serviceKey(status) {
  return status.SECRET_KEY || status.SERVICE_ROLE_KEY
}

export function publishableKey(status) {
  return status.PUBLISHABLE_KEY || status.ANON_KEY
}

// Where a developer script writes: the local stack, or production once you
// type "prod" (#112, #195). key is the service key.
export async function target(prod, action) {
  if (!prod) {
    const status = localStatus()
    return { apiUrl: status.API_URL, key: serviceKey(status), site: 'http://localhost:3100' }
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(`${action} in PRODUCTION (CoverMe, ${PROD_REF})? Type "prod" to continue: `)
  rl.close()
  if (answer.trim() !== 'prod') {
    console.log('Cancelled.')
    process.exit(1)
  }
  const res = supabase(['projects', 'api-keys', '--project-ref', PROD_REF, '--reveal', '-o', 'json'], { stdio: ['ignore', 'pipe', 'inherit'] })
  // Production has more than one secret key, and site-watch accepts only the
  // one the functions hold as SERVICE_KEY (#195).
  const secrets = res.status === 0 ? JSON.parse(res.stdout).filter((k) => k.type === 'secret') : []
  const secret = secrets.find((k) => k.name === 'edge_functions') ?? secrets[0]
  if (!secret) {
    console.error('Could not read the production secret key. Run `supabase login` and try again.')
    process.exit(1)
  }
  return { apiUrl: `https://${PROD_REF}.supabase.co`, key: secret.api_key, site: 'https://www.cover-me.dev' }
}

export function killTree(child) {
  if (!child || child.exitCode !== null) return
  if (isWindows) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else child.kill('SIGINT')
}
