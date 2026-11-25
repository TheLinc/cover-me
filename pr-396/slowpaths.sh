#!/usr/bin/env bash
# usage: slowpaths.sh <extension dir>
# Puts each guarded slow path back into the scraper, one at a time, and checks
# its cost case now fails. Restores the files after each one.
cd "$1" || exit 2
L=src/content/scrapers/linkedin.ts P=src/content/scrapers/page.ts T=src/content/scrapers/scrapers.test.ts
ok=0 bad=0
check() { # <name> <case filter> <file> <sed script> [raise cap]
  sed -i "$4" "$3"
  [ -n "$5" ] && sed -i 's/^const MAX_WORK = 2_000_000_000/const MAX_WORK = 20_000_000_000/' "$P"
  if git diff --quiet -- "$3"; then echo "SETUP FAILED: $1"; bad=$((bad+1)); return; fi
  out=$(node_modules/.bin/vitest run "$T" -t "$2" 2>&1 | sed 's/\x1b\[[0-9;]*m//g')
  git checkout -q -- "$L" "$P"
  if printf '%s' "$out" | grep -q "1 failed"; then
    ok=$((ok+1)); printf 'fails as it should: %-55s %s\n' "$1" "$(printf '%s\n' "$out" | grep -m1 -E 'AssertionError|Error:' | sed 's/^ *//')"
  else bad=$((bad+1)); printf 'STILL PASSES:       %s\n' "$1"; fi
}
for cap in "" raised; do
  if [ -n "$cap" ]; then echo "-- work cap raised to 20B, so only the work bound in the test can catch it"; else echo "-- work cap as shipped (2B)"; fi
  check "120 nested <p><span> (:scope > selectors)" "nested <p><span>" $L "s/const visualSpan = kids.find((k) => k.tagName === 'SPAN' \&\& k.getAttribute('aria-hidden') === 'true')/const visualSpan = p.querySelector<HTMLElement>(':scope > span[aria-hidden=\"true\"]')/; s/for (const span of kids.filter((k) => k.tagName === 'SPAN'))/for (const span of Array.from(p.querySelectorAll<HTMLElement>(':scope > span')))/" $cap
  check "120 nested company links (nested links read)" "120 nested company links" $L 's/if (posting.has(x) || seen.has(x)) return true/if (posting.has(x)) return true/' $cap
  check "120 nested Show more links (nested links read)" "Show more" $L 's/      if (nested) continue/      if (false \&\& nested) continue/' $cap
  check "80 nested title candidates (block spans read)" "80 nested title" $L "s/(el.querySelector('p, div') ? '' : el.innerText/(false ? '' : el.innerText/" $cap
done
echo "-- time-bound cases"
check "twelve hidden end markers (10 searches of 80)" "twelve hidden" $L 's/    if (hiddenInMarkup(el)) continue/    if (false \&\& hiddenInMarkup(el)) continue/; s/\.slice(0, 20)$/.slice(0, 80)/; s/searches < 3; el/searches < 10; el/'
check "60 nested shadow roots (deep-copied .content)" "60 nested shadow" $P 's/    while (t.firstChild) shadow.appendChild(t.firstChild)/    shadow.appendChild(t.content)/'
git status --short -- src
echo "slow paths caught: $ok, missed: $bad"
