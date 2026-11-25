// Usage: node proof-385.mjs <repo root> before|after
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'

const [root, side] = process.argv.slice(2)
const backend = join(root, 'backend')
const testFile = join(backend, 'tests/integration/answer.test.ts')
const anchor = "    const [generated] = await mockPosthog.eventsFor('answer_generated', user.id)\n"

function typecheck() {
  const r = spawnSync('npx -y pnpm@10 typecheck', { cwd: backend, shell: true, encoding: 'utf8' })
  return { code: r.status, out: (r.stdout + r.stderr).trim().split('\n').filter((l) => !l.startsWith('>') && l.trim()).join('\n') }
}

const ci = readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8')
const backendJob = ci.slice(ci.indexOf('\n  backend:'))
const ciRunsIt = /run: pnpm typecheck/.test(backendJob)
console.log(`$ grep 'run: pnpm typecheck' (backend job of ci.yml)\n${ciRunsIt ? 'found' : 'not found'}\n`)

const clean = typecheck()
console.log(`$ pnpm typecheck   # tests as they are\n${clean.out}\nexit ${clean.code}\n`)

const original = readFileSync(testFile, 'utf8')
const eol = original.includes('\r\n') ? '\r\n' : '\n'
const a = anchor.replace('\n', eol)
assert.ok(original.includes(a), 'anchor line not found')
writeFileSync(testFile, original.replace(a, a + '    await mockPosthog.events()' + eol))
let broken
try { broken = typecheck() } finally { writeFileSync(testFile, original) }
console.log(`$ pnpm typecheck   # answer.test.ts calls mockPosthog.events(), removed in #383\n${broken.out}\nexit ${broken.code}`)

if (side === 'before') {
  assert.equal(ciRunsIt, false)
  assert.notEqual(clean.code, 0)
  assert.match(clean.out, /typecheck/)
  assert.doesNotMatch(broken.out, /TS2339/)
} else {
  assert.equal(ciRunsIt, true)
  assert.equal(clean.code, 0)
  assert.equal(broken.code, 2)
  assert.match(broken.out, /answer\.test\.ts\(\d+,\d+\): error TS2339: Property 'events' does not exist/)
}
console.log(`\n${side}: assertions passed`)
