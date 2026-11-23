// Usage: node proof-dev-server.mjs <web dir> <before|after> [runs=3]
// Starts `next dev` on a cold .next cache, requests the three pages from #320,
// and records whether the server hits "require is not defined" or exits.
import { spawn, execSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { join } from 'node:path'

const [webDir, label, runsArg] = process.argv.slice(2)
const runs = Number(runsArg ?? 3)
const port = 3100
const pages = ['/auth', '/dashboard', '/dashboard/settings']

const killTree = (pid) => { try { execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' }) } catch {} }

async function oneRun(n) {
  if (!process.env.KEEP_NEXT) rmSync(join(webDir, '.next'), { recursive: true, force: true })
  const child = spawn(process.execPath,
    ['--env-file-if-exists=.env.localdb', 'node_modules/next/dist/bin/next', 'dev', '-p', String(port)],
    { cwd: webDir, stdio: ['ignore', 'pipe', 'pipe'] })
  let log = ''
  let exited = null
  child.stdout.on('data', (d) => { log += d })
  child.stderr.on('data', (d) => { log += d })
  child.on('exit', (code) => { exited = code })

  const deadline = Date.now() + 120_000
  while (!log.includes('Ready') && exited === null && Date.now() < deadline) await new Promise((r) => setTimeout(r, 250))

  const results = []
  for (const page of pages) {
    if (exited !== null) { results.push(`${page} -> server gone`); continue }
    try {
      const res = await fetch(`http://localhost:${port}${page}`, { redirect: 'manual', signal: AbortSignal.timeout(240_000) })
      results.push(`${page} -> ${res.status}${res.headers.get('location') ? ` (to ${res.headers.get('location')})` : ''}`)
    } catch (e) {
      results.push(`${page} -> ${e.cause?.code ?? e.name}`)
    }
  }
  await new Promise((r) => setTimeout(r, 3000))
  const requireError = /require is not defined/.test(log)
  const crashed = exited !== null
  killTree(child.pid)
  await new Promise((r) => setTimeout(r, 2000))
  console.log(`[${label}] run ${n}: ${results.join(', ')} | server ${crashed ? `exited (code ${exited})` : 'still up'} | "require is not defined" in log: ${requireError ? 'yes' : 'no'}`)
  if (requireError || process.env.SHOW_LOG) console.log(log.split('\n').filter((l) => /Compil|require is not defined|tailwind\.config|GET /.test(l)).slice(0, 8).map((l) => `    ${l.trim()}`).join('\n'))
  return { requireError, crashed, served: results.every((r) => /-> \d{3}/.test(r)) }
}

const all = []
for (let n = 1; n <= runs; n++) all.push(await oneRun(n))

const anyError = all.some((r) => r.requireError || r.crashed)
if (label === 'after' && (anyError || !all.every((r) => r.served))) { console.error('FAIL: after should serve every page with no require error'); process.exit(1) }
if (label === 'before' && !anyError) { console.error('FAIL: before did not reproduce the require error'); process.exit(1) }
console.log(`[${label}] ${label === 'after' ? 'PASS: every page compiled in every run' : 'PASS: base hits the require error'}`)
