// Usage: node ci-gate.mjs <checkout> <expect: before|after>
// Runs the extension and web CI job steps from <checkout>/.github/workflows/ci.yml
// (skipping install), the way CI does: in order, stopping at the first failure.
// Cases: clean tree, a type error, an unused import. Restores every file it edits.
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'

const [root, expect] = process.argv.slice(2)
const ci = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8').replace(/\r/g, '')
const steps = (job) => {
  const block = ci.split(new RegExp(`^  ${job}:\n`, 'm'))[1].split(/^  \S/m)[0]
  return [...block.matchAll(/^      - run: (.+)$/gm)].map((m) => m[1]).filter((c) => !/install|rebuild/.test(c))
}
const targets = {
  extension: { file: 'extension/src/lib/debug.ts', typeError: "export const x: number = 'a'\n", unusedImport: "import { WEB_URL } from './config'\n" },
  web: { file: 'web/lib/avatar.ts', typeError: "export const x: number = 'a'\n", unusedImport: "import { clsx } from 'clsx'\n" },
}
function runJob(job) {
  for (const step of steps(job)) {
    const cmd = step.replace(/^pnpm /, 'npx -y pnpm@10 ')
    try { execSync(cmd, { cwd: path.join(root, job), stdio: 'pipe', encoding: 'utf8' }) }
    catch (e) {
      const out = (e.stdout + e.stderr).split('\n').filter((l) => /error|✖/.test(l)).slice(0, 2).map((l) => l.trim()).join(' | ')
      return { ok: false, failedAt: step, out }
    }
  }
  return { ok: true }
}
const results = {}
for (const job of ['extension', 'web']) {
  console.log(`\n${job} job steps: ${steps(job).join(' -> ')}`)
  for (const kase of ['clean', 'typeError', 'unusedImport']) {
    const t = targets[job]; const file = path.join(root, t.file); const orig = fs.readFileSync(file, 'utf8')
    if (kase === 'typeError') fs.writeFileSync(file, orig + t.typeError)
    if (kase === 'unusedImport') fs.writeFileSync(file, t.unusedImport + orig)
    try { results[`${job}/${kase}`] = runJob(job) } finally { fs.writeFileSync(file, orig) }
    const r = results[`${job}/${kase}`]
    console.log(`  ${kase.padEnd(12)} ${r.ok ? 'CI GREEN' : `CI RED at "${r.failedAt}": ${r.out}`}`)
  }
}
for (const job of ['extension', 'web']) {
  assert.ok(results[`${job}/clean`].ok, `${job} clean tree should pass`)
  for (const kase of ['typeError', 'unusedImport']) {
    const r = results[`${job}/${kase}`]
    if (expect === 'before') assert.ok(r.ok, `${job}/${kase}: expected the bad change to merge green on the base`)
    else assert.ok(!r.ok, `${job}/${kase}: expected CI to fail`)
  }
}
if (expect === 'after') {
  assert.equal(results['extension/typeError'].failedAt, 'pnpm typecheck')
  assert.equal(results['web/typeError'].failedAt, 'pnpm typecheck')
  assert.equal(results['extension/unusedImport'].failedAt, 'pnpm exec eslint .')
  assert.equal(results['web/unusedImport'].failedAt, 'pnpm exec eslint .')
}
console.log(`\nassertions for "${expect}" passed`)
