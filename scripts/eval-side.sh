#!/usr/bin/env bash
# Which sides of the output eval a diff needs: prints "all", or the sides to
# run separated by spaces (letters, tailor, answers), each a `pnpm eval` flag.
# Letters, resume tailoring and application answers share no prompt code, so
# a change to one side doesn't need the others' model calls (tailoring is ~70%
# of a full run).
#
#   scripts/eval-side.sh <base-ref>        diff <base-ref>...HEAD
#   scripts/eval-side.sh --files a b c     classify these paths (for testing)
#
# Anything not listed as one side (model clients, the eval harness, fixtures,
# the prompt-sync script) runs all, and so does an empty diff.
set -euo pipefail

if [ "${1:-}" = "--files" ]; then
  shift
  files=$(printf '%s\n' "$@")
else
  files=$(git diff --name-only "${1:?base ref}...HEAD")
fi

letters=false
tailor=false
answers=false
while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in
    extension/src/lib/ai/index.ts | extension/src/lib/ai/letter-lint* | \
    backend/supabase/functions/generate/* | backend/supabase/functions/_shared/letter-lint.ts)
      letters=true ;;
    extension/src/lib/ai/resume-* | extension/src/lib/ai/ats-score* | extension/src/lib/ai/tailor-progress* | \
    extension/src/lib/ai/parse-delta* | backend/supabase/functions/tailor/* | \
    backend/supabase/functions/_shared/resume-parse.ts | backend/supabase/functions/_shared/resume-grounding.ts | \
    backend/supabase/functions/_shared/ats-score.ts | \
    extension/eval/claim-pairs.ts | extension/eval/line-pairs.ts)
      tailor=true ;;
    extension/src/lib/ai/answer* | backend/supabase/functions/answer/* | \
    backend/supabase/functions/_shared/answer.ts | extension/eval/answer-cases.ts)
      answers=true ;;
    extension/src/lib/ai/* | extension/eval/* | backend/supabase/functions/_shared/anthropic.ts | scripts/check-prompt-sync.mjs)
      letters=true; tailor=true; answers=true ;;
  esac
done <<< "$files"

sides=""
[ "$letters" = true ] && sides="$sides letters"
[ "$tailor" = true ] && sides="$sides tailor"
[ "$answers" = true ] && sides="$sides answers"
sides="${sides# }"
if [ -z "$sides" ] || [ "$sides" = "letters tailor answers" ]; then echo all
else echo "$sides"
fi
