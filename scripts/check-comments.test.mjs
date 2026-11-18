import { test } from 'node:test'
import assert from 'node:assert/strict'
import { unlinkedComments } from './check-comments.mjs'

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
