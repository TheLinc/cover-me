// Fails on comments that don't link their reason, in every file a PR changes (#271).
// node scripts/check-comments.mjs [base, default origin/master] checks what changed
// since the base, uncommitted files too. --hook is for Claude Code, which passes the
// edited file as JSON on stdin (#276).
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ts = ['extension', 'web'].map((pkg) => {
  try { return createRequire(path.join(root, pkg, 'package.json'))('typescript') } catch { return null }
}).find(Boolean)

const LINKED = /https?:\/\/|(^|[^\w&])#\d+\b|docs\/adr\//
const ALLOWED = [/^\/\/\s*ponytail:/, /^\/\/\/\s*<reference /, /^\/\*\s*@vite-ignore\s*\*\/$/]
const CHECKED = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/

export function unlinkedComments(text, file) {
  const kind = /x$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind)
  const ranges = new Map()
  // A JSX child list starts where its first text does, so it's skipped too (#271).
  const isText = (node) => node.kind === ts.SyntaxKind.JsxText || (node.kind === ts.SyntaxKind.SyntaxList && node.getChildren(sf)[0]?.kind === ts.SyntaxKind.JsxText)
  const visit = (node) => {
    if (!isText(node)) {
      for (const r of [...(ts.getTrailingCommentRanges(text, node.pos) ?? []), ...(ts.getLeadingCommentRanges(text, node.pos) ?? [])]) ranges.set(r.pos, r)
    }
    for (const child of node.getChildren(sf)) visit(child)
  }
  visit(sf)

  const blocks = []
  for (const r of [...ranges.values()].sort((a, b) => a.pos - b.pos)) {
    const prev = blocks.at(-1)
    const single = r.kind === ts.SyntaxKind.SingleLineCommentTrivia
    const joins = prev?.single && prev.ownLine && single && /^[ \t]*\r?\n[ \t]*$/.test(text.slice(prev.end, r.pos))
    if (joins) Object.assign(prev, { end: r.end, parts: [...prev.parts, text.slice(r.pos, r.end)] })
    else blocks.push({ pos: r.pos, end: r.end, single, ownLine: /(^|\n)[ \t]*$/.test(text.slice(0, r.pos)), parts: [text.slice(r.pos, r.end)] })
  }
  return blocks
    .filter((b) => !LINKED.test(b.parts.join('\n')) && !ALLOWED.some((re) => re.test(b.parts[0])))
    .map((b) => ({ line: sf.getLineAndCharacterOfPosition(b.pos).line + 1, text: b.parts[0] }))
}

const checked = (f) => CHECKED.test(f) && !/\.d\.[mc]?ts$/.test(f) && !/(^|\/)(node_modules|dist)\//.test(f)

function changedFiles(base) {
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' })
  const since = git('merge-base', base, 'HEAD').trim()
  const files = [git('diff', '--name-only', '-z', '--diff-filter=ACMR', since), git('ls-files', '-z', '--others', '--exclude-standard')]
  return [...new Set(files.join('\0').split('\0'))].filter(checked)
}

function editedFile() {
  const file = JSON.parse(fs.readFileSync(0, 'utf8') || '{}').tool_input?.file_path
  if (!file) return []
  const rel = path.relative(root, path.resolve(file)).split(path.sep).join('/')
  return !rel.startsWith('../') && !path.isAbsolute(rel) && checked(rel) && fs.existsSync(path.join(root, rel)) ? [rel] : []
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const asHook = process.argv[2] === '--hook'
  if (!ts) {
    if (asHook) process.exit(0)
    throw new Error('typescript not found: run pnpm install in extension/ or web/')
  }
  const files = asHook ? editedFile() : changedFiles(process.argv[2] ?? 'origin/master')
  const found = files.flatMap((f) => unlinkedComments(fs.readFileSync(path.join(root, f), 'utf8'), f).map((c) => `${f}:${c.line}  ${c.text.slice(0, 100)}`))
  if (found.length) {
    console.error(found.join('\n'))
    console.error(`\n${found.length} comment(s) with no link, in files this change touches.
A comment must give a reason the code can't show, and link to it. Every comment in a file you change is checked, old ones too.
- If it says what the code does, delete it. Rename or restructure the code until it explains itself.
- If it explains why, put the reason in a ticket or an ADR and link it: #123, a URL, or docs/adr/<file>.
  A comment you just wrote for the ticket you're on: add its number, (#N).
  An older one: the ticket or PR that added it often has the reason: git log -L <line>,<line>:<file>
Allowed without a link: "// ponytail:" notes, "/// <reference ...>", "/* @vite-ignore */".`)
    process.exit(asHook ? 2 : 1)
  }
  if (!asHook) console.log(`Comments OK in ${files.length} changed file(s).`)
}
