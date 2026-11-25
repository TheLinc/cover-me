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
let loaded
// Loaded on first use: the hook runs after every edit, most of them to files it skips (#276).
const typescript = () => (loaded ??= ['extension', 'web'].map((pkg) => {
  try { return createRequire(path.join(root, pkg, 'package.json'))('typescript') } catch { return null }
}).find(Boolean) ?? null)

const LINKED = /https?:\/\/|(^|[^\w&])#\d+\b|docs\/adr\//
const ALLOWED = [/^\/\/\s*ponytail:/, /^\/\/\/\s*<reference /, /^\/\*\s*@vite-ignore\s*\*\/$/]
const CHECKED = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/

function comments(text, file) {
  const ts = typescript()
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
    .filter((b) => !ALLOWED.some((re) => re.test(b.parts[0])))
    .map((b) => ({ line: sf.getLineAndCharacterOfPosition(b.pos).line + 1, text: b.parts[0], body: b.parts.join('\n') }))
}

export const unlinkedComments = (text, file) => comments(text, file).filter((c) => !LINKED.test(c.body))

const words = (c) => c.body.replace(/(\bsee:?\s+)?(https?:\/\/\S+|#\d+\b|docs\/adr\/\S+)/gi, ' ').match(/\w+/g)?.join(' ') ?? ''

export function stampedComments(baseText, text, file) {
  const before = new Set(unlinkedComments(baseText, file).map(words))
  return comments(text, file).filter((c) => LINKED.test(c.body) && before.has(words(c)))
}

const checked = (f) => CHECKED.test(f) && !/\.d\.[mc]?ts$/.test(f) && !/(^|\/)(node_modules|dist)\//.test(f)

function changedFiles(base) {
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' })
  const since = git('merge-base', base, 'HEAD').trim()
  const files = [git('diff', '--name-only', '-z', '--diff-filter=ACMR', since), git('ls-files', '-z', '--others', '--exclude-standard')]
  const show = (rel) => {
    try { return execFileSync('git', ['show', `${since}:${rel}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }) } catch { return '' }
  }
  return [...new Set(files.join('\0').split('\0'))].filter(checked).map((rel) => ({ abs: path.join(root, rel), rel, base: () => show(rel) }))
}

function repoOf(dir) {
  try {
    const [top, common] = execFileSync('git', ['-C', dir, 'rev-parse', '--show-toplevel', '--git-common-dir'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().split('\n')
    return { top, common: fs.realpathSync.native(path.resolve(dir, common)) }
  } catch {
    return null
  }
}

// Any worktree of this repo counts: a session can edit one it didn't start in (#276).
function editedFile() {
  const file = JSON.parse(fs.readFileSync(0, 'utf8') || '{}').tool_input?.file_path
  if (!file || !checked(file.split(path.sep).join('/')) || !fs.statSync(file, { throwIfNoEntry: false })?.isFile()) return []
  const abs = path.resolve(file)
  const [mine, theirs] = [repoOf(root), repoOf(path.dirname(abs))]
  if (!mine || !theirs || mine.common !== theirs.common) return []
  const rel = path.relative(theirs.top, abs).split(path.sep).join('/')
  return checked(rel) ? [{ abs, rel }] : []
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const asHook = process.argv[2] === '--hook'
  const files = asHook ? editedFile() : changedFiles(process.argv[2] ?? 'origin/master')
  if (files.length && !typescript()) {
    if (asHook) process.exit(0)
    console.error('typescript not found: run pnpm install in extension/ or web/')
    process.exit(1)
  }
  const list = (f, cs) => cs.map((c) => `${f.rel}:${c.line}  ${c.text.slice(0, 100)}`)
  const text = (f) => fs.readFileSync(f.abs, 'utf8')
  const found = files.flatMap((f) => list(f, unlinkedComments(text(f), f.rel)))
  const stamped = files.flatMap((f) => f.base ? list(f, stampedComments(f.base(), text(f), f.rel)) : [])
  if (stamped.length) {
    console.error(stamped.join('\n'))
    console.error(`\nOnly a link was added to this comment since the base. Delete it if it says what the code does;
keep it only with a reason the code can't show.${found.length ? '\n' : ''}`)
  }
  if (found.length) {
    console.error(found.join('\n'))
    console.error(`\n${found.length} comment(s) with no link, in files this change touches.
Every comment in a file you change is checked, old ones too. For each one, first ask whether it should exist:
- It says what the code does, restates a name, marks a section or narrates the change: delete it. Rename or
  restructure the code if it needs to say more. Adding a ticket number to one of these is not a fix.
- It gives a reason the code can't show (an outside bug, a hidden constraint, why not the obvious way): keep it
  to one or two lines and link the ticket or ADR that holds the reason: #123, a URL, or docs/adr/<file>.
  For a comment you just wrote, that's the ticket you're on. For an older one, git log -L <line>,<line>:<file>
  finds the PR that added it.
Allowed without a link: "// ponytail:" notes, "/// <reference ...>", "/* @vite-ignore */".`)
  }
  if (found.length || stamped.length) process.exit(asHook ? 2 : 1)
  if (!asHook) console.log(`Comments OK in ${files.length} changed file(s).`)
}
