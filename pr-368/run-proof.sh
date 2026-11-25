#!/usr/bin/env bash
# Runs the real line checker (pnpm eval --live --tailor) on master and on the branch with a fake claude on PATH,
# and asserts master fails the group on one unreadable reply while the branch warns and passes.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
BEFORE="$1"; AFTER="$2"
export FAKE_CLAUDE_CMD="$(cygpath -w "$HERE/fake-claude.mjs" 2>/dev/null || echo "$HERE/fake-claude.mjs")"
export PATH="$HERE/bin:$PATH"
run() { (cd "$1/extension" && node_modules/.bin/tsx eval/run.ts --live --tailor --case line-cook-to-sous-chef 2>&1 | sed -n '/=== Line checker/,/^$/p' | head -8); }
echo "### before (master)"; B="$(run "$BEFORE")"; echo "$B"
echo "### after (branch)";  A="$(run "$AFTER")";  echo "$A"
grep -q '\[FAIL\] line checker' <<<"$B" && grep -q 'FAIL: electrician: check reply could not be read' <<<"$B" || { echo "ASSERT before: expected the group to FAIL"; exit 1; }
grep -q '\[PASS\] line checker' <<<"$A" && grep -q "warn: electrician: check reply could not be read, twice: \"Sorry, I can't help with that.\" then \"Sorry, I can't help with that.\"" <<<"$A" || { echo "ASSERT after: expected PASS with the reply quoted"; exit 1; }
echo "ASSERTIONS PASSED"
