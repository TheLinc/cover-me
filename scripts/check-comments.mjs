// Fails on comments that don't link their reason, in every file a PR changes (#271).
// Run from anywhere: node scripts/check-comments.mjs [base, default origin/master]
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ts = createRequire(path.join(root, 'extension', 'package.json'))('typescript')

const LINKED = /https?:\/\/|(^|[^\w&])#\d+\b|docs\/adr\//
const ALLOWED = [/^\/\/\s*ponytail:/, /^\/\/\/\s*<reference /, /^\/\*\s*@vite-ignore\s*\*\/$/]
const CHECKED = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/

export function unlinkedComments(text, file) {
  const kind = /x$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind)
  const ranges = new Map()
  const visit = (node) => {
    if (node.kind !== ts.SyntaxKind.JsxText) {
      for (const r of [...(ts.getTrailingCommentRanges(text, node.pos) ?? []), ...(ts.getLeadingCommentRanges(text, node.pos) ?? [])]) ranges.set(r.pos, r)
    }
    for (const child of node.getChildren(sf)) visit(child)
  }
  visit(sf)

  const blocks = []
  for (const r of [...ranges.values()].sort((a, b) => a.pos - b.pos)) {
    const prev = blocks.at(-1)
    const joins = prev && prev.single && r.kind === ts.SyntaxKind.SingleLineCommentTrivia && /^[ \t]*\r?\n[ \t]*$/.test(text.slice(prev.end, r.pos))
    if (joins) Object.assign(prev, { end: r.end, parts: [...prev.parts, text.slice(r.pos, r.end)] })
    else blocks.push({ pos: r.pos, end: r.end, single: r.kind === ts.SyntaxKind.SingleLineCommentTrivia, parts: [text.slice(r.pos, r.end)] })
  }
  return blocks
    .filter((b) => !LINKED.test(b.parts.join('\n')) && !ALLOWED.some((re) => re.test(b.parts[0])))
    .map((b) => ({ line: sf.getLineAndCharacterOfPosition(b.pos).line + 1, text: b.parts[0] }))
}

function changedFiles(base) {
  const out = execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`], { cwd: root, encoding: 'utf8' })
  return out.split('\n').filter((f) => CHECKED.test(f) && !f.endsWith('.d.ts') && !/(^|\/)(node_modules|dist)\//.test(f))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = changedFiles(process.argv[2] ?? 'origin/master')
  const found = files.flatMap((f) => unlinkedComments(fs.readFileSync(path.join(root, f), 'utf8'), f).map((c) => `${f}:${c.line}  ${c.text.slice(0, 100)}`))
  if (found.length) {
    console.error(found.join('\n'))
    console.error(`\n${found.length} comment(s) with no link, in files this change touches.
A comment must give a reason the code can't show, and link to it. Every comment in a file you change is checked, old ones too.
- If it says what the code does, delete it. Rename or restructure the code until it explains itself.
- If it explains why, put the reason in a ticket or an ADR and link it: #123, a URL, or docs/adr/<file>.
  The ticket or PR that added the code often has the reason already: git log -L <line>,<line>:<file>
Allowed without a link: "// ponytail:" notes, "/// <reference ...>", "/* @vite-ignore */".`)
    process.exit(1)
  }
  console.log(`Comments OK in ${files.length} changed file(s).`)
}
