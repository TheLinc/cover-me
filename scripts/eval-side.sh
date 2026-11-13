#!/usr/bin/env bash
# Which side of the output eval a diff needs: prints letters, tailor or both.
# Letters and resume tailoring share no prompt code, so a change to one side
# doesn't need the other's model calls (tailoring is ~70% of a full run).
#
#   scripts/eval-side.sh <base-ref>        diff <base-ref>...HEAD
#   scripts/eval-side.sh --files a b c     classify these paths (for testing)
#
# Anything not listed as one side (model clients, the eval harness, fixtures,
# the prompt-sync script) runs both, and so does an empty diff.
set -euo pipefail

if [ "${1:-}" = "--files" ]; then
  shift
  files=$(printf '%s\n' "$@")
else
  files=$(git diff --name-only "${1:?base ref}...HEAD")
fi

letters=false
tailor=false
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
    extension/src/lib/ai/* | extension/eval/* | backend/supabase/functions/_shared/anthropic.ts | scripts/check-prompt-sync.mjs)
      letters=true; tailor=true ;;
  esac
done <<< "$files"

if [ "$letters" = "$tailor" ]; then echo both
elif [ "$letters" = true ]; then echo letters
else echo tailor
fi
