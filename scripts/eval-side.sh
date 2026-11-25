#!/usr/bin/env bash
# Letters, tailoring and answers share no prompt code, so a diff runs only its sides (tailoring is ~70% of a full run).
# " lint-warn" after "all" means no letter file changed: pass it as --lint-warn so a letter that still
# fails lint after its retry warns instead of failing the job (#243).
set -euo pipefail

if [ "${1:-}" = "--files" ]; then
  shift
  files=$(printf '%s\n' "$@")
else
  files=$(git diff --name-only "${1:?base ref}...HEAD")
fi

letters=false
letter_files=false
tailor=false
answers=false
while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in
    extension/src/lib/ai/index.ts | extension/src/lib/ai/letter-lint* | \
    backend/supabase/functions/generate/* | backend/supabase/functions/_shared/letter-lint.ts)
      letters=true; letter_files=true ;;
    extension/src/lib/ai/resume-* | extension/src/lib/ai/ats-score* | extension/src/lib/ai/tailor-progress* | \
    extension/src/lib/ai/parse-delta* | backend/supabase/functions/tailor/* | \
    backend/supabase/functions/_shared/resume-parse.ts | backend/supabase/functions/_shared/resume-grounding.ts | \
    backend/supabase/functions/_shared/ats-score.ts | \
    extension/src/lib/ai/keyword-rules* | backend/supabase/functions/_shared/keyword-rules.ts | \
    extension/eval/claim-pairs.ts | extension/eval/line-pairs.ts)
      tailor=true ;;
    extension/src/lib/ai/answer* | backend/supabase/functions/answer/* | \
    backend/supabase/functions/_shared/answer.ts | extension/eval/answer-cases.ts)
      answers=true ;;
    # The model clients set the letter model, so they count as letter files.
    extension/src/lib/ai/claude.ts | backend/supabase/functions/_shared/anthropic.ts)
      letters=true; letter_files=true; tailor=true; answers=true ;;
    extension/src/lib/ai/* | extension/eval/* | scripts/check-prompt-sync.mjs)
      letters=true; tailor=true; answers=true ;;
  esac
done <<< "$files"

sides=""
[ "$letters" = true ] && sides="$sides letters"
[ "$tailor" = true ] && sides="$sides tailor"
[ "$answers" = true ] && sides="$sides answers"
sides="${sides# }"
if [ -z "$sides" ] || [ "$sides" = "letters tailor answers" ]; then sides=all; fi
if [ "$sides" = all ] && [ "$letter_files" = false ] && [ -n "$files" ]; then sides="all lint-warn"; fi
echo "$sides"
