#!/usr/bin/env bash
# usage: loadtest.sh <extension dir> <rounds> <loaders>
cd "$1" || exit 2
rounds=${2:-3}; loaders=${3:-2}; fails=0
for r in $(seq 1 "$rounds"); do
  pids=()
  for l in $(seq 1 "$loaders"); do node_modules/.bin/vitest run >/dev/null 2>&1 & pids+=($!); done
  sleep 2
  out=$(corepack pnpm@10 test 2>&1)
  for p in "${pids[@]}"; do wait "$p"; done
  summary=$(printf '%s\n' "$out" | sed 's/\x1b\[[0-9;]*m//g' | grep -E '^ *(Tests|Duration) ' | tr -s ' ' | tr '\n' ' ')
  printf 'round %s: %s\n' "$r" "$summary"
  if printf '%s\n' "$out" | grep -q "failed"; then
    fails=$((fails+1))
    printf '%s\n' "$out" | sed 's/\x1b\[[0-9;]*m//g' | grep -E "FAIL .*>|AssertionError" | sort -u
  fi
done
echo "rounds failed: $fails of $rounds"
