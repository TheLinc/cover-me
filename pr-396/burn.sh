#!/usr/bin/env bash
# usage: burn.sh <extension dir> <rounds> <burners>: scraper tests with every core busy
cd "$1" || exit 2
rounds=${2:-3}; n=${3:-24}; fails=0
pids=()
for i in $(seq 1 "$n"); do node -e "for(;;){}" & pids+=($!); done
sleep 1
for r in $(seq 1 "$rounds"); do
  out=$(node_modules/.bin/vitest run src/content/scrapers/scrapers.test.ts 2>&1 | sed 's/\x1b\[[0-9;]*m//g')
  printf 'round %s: %s\n' "$r" "$(printf '%s\n' "$out" | grep -E '^ *Tests ' | tr -s ' ')"
  if printf '%s\n' "$out" | grep -q " failed"; then fails=$((fails+1)); printf '%s\n' "$out" | grep -E "^ *FAIL .*>|AssertionError" | sort -u | sed 's/^/    /'; fi
done
kill "${pids[@]}" 2>/dev/null
echo "rounds failed: $fails of $rounds"
