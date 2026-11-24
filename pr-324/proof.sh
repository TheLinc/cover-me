#!/usr/bin/env bash
# Proof for #304. Usage: proof.sh <before-repo> <after-repo>
# Runs `eval/run.ts --live --tailor` on one case in each checkout with fake-claude.mjs preloaded:
# every model call reports 1M input + 1M output tokens and makes no real call.
# Expected cost per tailor at 1M/1M: Sonnet 4.6 $3/$15 = $18, Sonnet 5.5 $2/$10 = $12, Haiku 4.5 $1/$5 = $6.
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
FAKE="file:///$(cygpath -m "$HERE/fake-claude.mjs" 2>/dev/null || echo "$HERE/fake-claude.mjs")"
fail=0

table() { # <repo> <extra args...>
  local repo=$1; shift
  (cd "$repo/extension" && ./node_modules/.bin/tsx --import "$FAKE" eval/run.ts --live --tailor --case tech-missing-stack "$@" 2>&1) |
    grep -E '^\| (Step|---|parse|tailor)' | sed -n '1,4p'
}
expect() { # <label> <table> <row regex>
  if grep -qE "$3" <<<"$2"; then echo "  ok: $1"; else echo "  FAIL: $1 (wanted /$3/)"; fail=1; fi
}

for side in before after; do
  repo=$([ $side = before ] && echo "$1" || echo "$2")
  echo "== $side: $(git -C "$repo" log --oneline -1)"
  echo "-- \$ pnpm eval --live --tailor --case tech-missing-stack   (models: tailor claude-sonnet-5-5, parse claude-haiku-4-5)"
  t1=$(table "$repo"); echo "$t1"
  echo "-- \$ pnpm eval --live --tailor --case tech-missing-stack --parse-model claude-made-up-1"
  t2=$(table "$repo" --parse-model claude-made-up-1); echo "$t2"
  if [ $side = before ]; then
    expect "before: Sonnet 5.5 tailor priced at the Sonnet 4.6 rate (\$18)" "$t1" '^\| tailor .*\| \$18\.0000 \|$'
    expect "before: unpriced parse model shown with Haiku 4.5's price (\$6)" "$t2" '^\| parse .*\| \$6\.0000 \|$'
  else
    expect "after: Sonnet 5.5 tailor priced at \$2/\$10 (\$12)" "$t1" '^\| tailor .*\| \$12\.0000 \|$'
    expect "after: Haiku 4.5 parse still \$1/\$5 (\$6)" "$t1" '^\| parse .*\| \$6\.0000 \|$'
    expect "after: unpriced parse model shown as unknown" "$t2" '^\| parse .*\| unknown \(claude-made-up-1\) \|$'
  fi
  echo
done
exit $fail
