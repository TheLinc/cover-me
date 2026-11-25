import { test } from 'node:test'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { stampedComments, unlinkedComments } from './check-comments.mjs'

const lines = (text, file = 'a.ts') => unlinkedComments(text, file).map((c) => c.line)

test('flags a comment with no link', () => {
  assert.deepEqual(lines('const a = 1\n// adds one\nconst b = a + 1\n'), [2])
  assert.deepEqual(lines('/* the total */\nconst t = 0\n'), [1])
})

test('a ticket, URL or ADR anywhere in a comment block passes it', () => {
  assert.deepEqual(lines('// Chrome caches the worker\n// (#239)\nconst a = 1\n'), [])
  assert.deepEqual(lines('// see https://crbug.com/1\nconst a = 1\n'), [])
  assert.deepEqual(lines('// docs/adr/0001-storage.md\nconst a = 1\n'), [])
})

test('a blank line splits blocks, so each needs its own link', () => {
  assert.deepEqual(lines('// #12\n\n// no link\nconst a = 1\n'), [3])
})

test('allows ponytail notes and functional comments', () => {
  assert.deepEqual(lines('// ponytail: global lock, per-account locks if it matters\nconst a = 1\n'), [])
  assert.deepEqual(lines('/// <reference types="vite/client" />\nconst a = 1\n'), [])
  assert.deepEqual(lines('const m = await import(/* @vite-ignore */ url)\n'), [])
})

test('a suppression needs a link like any other comment', () => {
  assert.deepEqual(lines('// eslint-disable-next-line no-console\nconsole.log(1)\n'), [1])
  assert.deepEqual(lines('// @ts-expect-error #40 the types lag the API\nconst a: number = "x"\n'), [])
})

test('finds JSX comments and ignores comment-like JSX text and strings', () => {
  assert.deepEqual(lines('const a = <div>\n  {/* the header */}\n  http://x // y\n</div>\n', 'a.tsx'), [2])
  assert.deepEqual(lines('const s = "// not a comment"\n'), [])
})

test('a hex colour is not a ticket', () => {
  assert.deepEqual(lines('// #fff on dark\nconst a = 1\n'), [1])
})

test('finds a comment at the end of a line of code', () => {
  assert.deepEqual(lines('const a = 1 // one\nconst b = 2\n'), [1])
  assert.deepEqual(lines('#!/usr/bin/env node\nconst a = 1\n'), [])
})

test('JSX text that looks like a comment is not one, even as the first child', () => {
  assert.deepEqual(lines('const a = <p>// not a comment</p>\n', 'a.tsx'), [])
  assert.deepEqual(lines('const a = <p>\n  // text\n</p>\n', 'a.tsx'), [])
})

test("an end-of-line comment doesn't borrow the next line's link", () => {
  assert.deepEqual(lines('const a = 1 // one\n// #5\nconst b = 2\n'), [1])
})

test('flags a comment whose only change from the base is an added link, even on another line', () => {
  const base = 'const a = 1\n// adds one\nconst b = a + 1\n'
  const stamped = (text) => stampedComments(base, text, 'a.ts').map((c) => c.line)
  assert.deepEqual(stamped('const a = 1\n// adds one (#1)\nconst b = a + 1\n'), [2])
  assert.deepEqual(stamped('const z = 0\nconst a = 1\n// adds one, see https://x.dev/1\nconst b = a + 1\n'), [3])
  assert.deepEqual(stamped('const a = 1\n// Safari rounds this down (#1)\nconst b = a + 1\n'), [])
  assert.deepEqual(stamped('const a = 1\n// Adds one (#1)\nconst b = a + 1\n'), [2])
  assert.deepEqual(stampedComments('// adds one (#1)\nconst b = 2\n', '// adds one (#1)\nconst b = 2\n', 'a.ts'), [])
  assert.deepEqual(stampedComments('// ------\nconst b = 2\n', '// https://crbug.com/1\nconst b = 2\n', 'a.ts'), [])
})

const script = fileURLToPath(new URL('./check-comments.mjs', import.meta.url))

test('as lint, checks files not committed yet', () => {
  const file = fileURLToPath(new URL('./lint-test.tmp.ts', import.meta.url))
  try {
    fs.writeFileSync(file, '// adds one\nexport const b = 2\n')
    const run = spawnSync(process.execPath, [script, 'HEAD'], { encoding: 'utf8' })
    assert.equal(run.status, 1)
    assert.match(run.stderr, /scripts\/lint-test\.tmp\.ts:1/)
  } finally {
    fs.rmSync(file, { force: true })
  }
})

const hook = (filePath) => spawnSync(process.execPath, [script, '--hook'], {
  input: JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: filePath } }),
  encoding: 'utf8',
})

test('as a Claude Code hook, exits 2 with the line and the fix for an edited file', () => {
  const file = fileURLToPath(new URL('./hook-test.tmp.ts', import.meta.url))
  try {
    fs.writeFileSync(file, 'const a = 1\n// adds one\nexport const b = a + 1\n')
    const run = hook(file)
    assert.equal(run.status, 2)
    assert.match(run.stderr, /scripts\/hook-test\.tmp\.ts:2 {2}\/\/ adds one/)
    assert.match(run.stderr, /whether it should exist/)
    fs.writeFileSync(file, '// #276\nexport const b = 2\n')
    assert.deepEqual([hook(file).status, hook(file).stderr], [0, ''])
  } finally {
    fs.rmSync(file, { force: true })
  }
})

const bad = '// adds one\nexport const b = 2\n'
const git = (cwd, ...args) => spawnSync('git', args, { cwd, encoding: 'utf8' })

test('as a hook, ignores files it does not check', () => {
  assert.equal(hook(fileURLToPath(new URL('../extension/src/popup/index.css', import.meta.url))).status, 0)
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-outside-'))
  try {
    fs.writeFileSync(path.join(dir, 'outside.ts'), bad)
    assert.deepEqual([hook(path.join(dir, 'outside.ts')).status, hook(path.join(dir, 'outside.ts')).stderr], [0, ''])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("as a hook, checks a file in another worktree of the repo", () => {
  const dir = path.join(os.tmpdir(), `cc-worktree-${process.pid}`)
  assert.equal(git(path.dirname(script), 'worktree', 'add', '--detach', '--no-checkout', dir, 'HEAD').status, 0)
  try {
    fs.writeFileSync(path.join(dir, 'bad.ts'), bad)
    const run = hook(path.join(dir, 'bad.ts'))
    assert.equal(run.status, 2)
    assert.match(run.stderr, /^bad\.ts:1/m)
  } finally {
    git(path.dirname(script), 'worktree', 'remove', '--force', dir)
  }
})

test('as lint, fails a comment that only gained a link since the base, and passes a rewrite', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-stamp-'))
  const ts = path.dirname(createRequire(path.join(path.dirname(script), '..', 'extension', 'package.json')).resolve('typescript/package.json'))
  try {
    git(dir, 'init', '-q')
    fs.mkdirSync(path.join(dir, 'scripts'))
    fs.copyFileSync(script, path.join(dir, 'scripts', 'check-comments.mjs'))
    fs.mkdirSync(path.join(dir, 'extension', 'node_modules'), { recursive: true })
    fs.symlinkSync(ts, path.join(dir, 'extension', 'node_modules', 'typescript'), 'junction')
    fs.writeFileSync(path.join(dir, 'a.ts'), 'const a = 1\n// adds one\nexport const b = a + 1\n')
    git(dir, 'add', 'a.ts')
    git(dir, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base')
    const lint = () => spawnSync(process.execPath, [path.join(dir, 'scripts', 'check-comments.mjs'), 'HEAD'], { encoding: 'utf8' })

    fs.writeFileSync(path.join(dir, 'a.ts'), 'const a = 1\n// adds one (#1)\nexport const b = a + 1\n')
    const run = lint()
    assert.equal(run.status, 1)
    assert.match(run.stderr, /^a\.ts:2 {2}\/\/ adds one \(#1\)/m)
    assert.match(run.stderr, /Only a link was added to 1 comment\(s\)/)

    fs.writeFileSync(path.join(dir, 'a.ts'), 'const a = 1\n// Safari rounds this down (#1)\nexport const b = a + 1\n')
    assert.equal(lint().status, 0)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('as a hook, exits 0 when typescript is not installed', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-nots-'))
  try {
    git(dir, 'init', '-q')
    fs.mkdirSync(path.join(dir, 'scripts'))
    fs.copyFileSync(script, path.join(dir, 'scripts', 'check-comments.mjs'))
    fs.writeFileSync(path.join(dir, 'bad.ts'), bad)
    const run = spawnSync(process.execPath, [path.join(dir, 'scripts', 'check-comments.mjs'), '--hook'], {
      input: JSON.stringify({ tool_input: { file_path: path.join(dir, 'bad.ts') } }),
      encoding: 'utf8',
    })
    assert.deepEqual([run.status, run.stderr], [0, ''])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
