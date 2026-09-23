import { spawn, spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const BACKEND = join(dirname(fileURLToPath(import.meta.url)), '..')
export const REPO = join(BACKEND, '..')

const isWindows = process.platform === 'win32'
const SUPABASE_BIN = join(BACKEND, 'node_modules', '.bin', isWindows ? 'supabase.cmd' : 'supabase')

// Runs the pinned CLI from backend/node_modules. shell is needed on Windows
// to execute .cmd shims.
export function supabase(args, opts = {}) {
  return spawnSync(SUPABASE_BIN, args, { cwd: BACKEND, shell: isWindows, encoding: 'utf8', ...opts })
}

export function supabaseAsync(args, opts = {}) {
  return spawn(SUPABASE_BIN, args, { cwd: BACKEND, shell: isWindows, ...opts })
}

// Local stack URLs and keys from `supabase status -o env`, e.g.
// { API_URL, PUBLISHABLE_KEY, SECRET_KEY, ANON_KEY, SERVICE_ROLE_KEY, ... }.
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

// The functions read SERVICE_KEY. Prefer the new-style secret key, which is
// what the hosted projects use; fall back to the legacy service_role JWT.
export function serviceKey(status) {
  return status.SECRET_KEY || status.SERVICE_ROLE_KEY
}

export function publishableKey(status) {
  return status.PUBLISHABLE_KEY || status.ANON_KEY
}

export function killTree(child) {
  if (!child || child.exitCode !== null) return
  if (isWindows) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else child.kill('SIGINT')
}
