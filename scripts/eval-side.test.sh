#!/usr/bin/env bash
# Self-test for eval-side.sh. Run: bash scripts/eval-side.test.sh
set -u
cd "$(dirname "$0")"
fail=0
t() {
  got=$(bash eval-side.sh --files "${@:2}")
  if [ "$got" != "$1" ]; then echo "FAIL: want $1, got $got for: ${*:2}"; fail=1; fi
}
t letters extension/src/lib/ai/index.ts backend/supabase/functions/_shared/letter-lint.ts
t letters extension/src/lib/ai/letter-lint.test.ts backend/supabase/functions/generate/index.ts
t tailor extension/src/lib/ai/resume-tailor.ts backend/supabase/functions/tailor/index.ts
t tailor backend/supabase/functions/_shared/resume-grounding.ts extension/eval/claim-pairs.ts
t tailor extension/src/lib/ai/keyword-rules.ts backend/supabase/functions/_shared/keyword-rules.ts
t "letters tailor" extension/src/lib/ai/index.ts extension/src/lib/ai/resume-parse.ts
t answers extension/src/lib/ai/answer.ts backend/supabase/functions/answer/index.ts
t answers backend/supabase/functions/_shared/answer.ts extension/eval/answer-cases.ts
t "letters answers" backend/supabase/functions/generate/index.ts extension/src/lib/ai/answer.test.ts
t "all lint-warn" extension/eval/run.ts
t "all lint-warn" README.md
# The model clients set the letter model, and an empty diff (a manual run on
# master) has no PR to spare. Both keep letter-lint failures failing.
t all extension/src/lib/ai/claude.ts
t all backend/supabase/functions/_shared/anthropic.ts
t all
# A letter file in the diff keeps letter-lint failures failing the job.
t all extension/eval/run.ts extension/src/lib/ai/index.ts
t all extension/eval/run.ts backend/supabase/functions/_shared/letter-lint.ts
[ "$fail" = 0 ] && echo "eval-side: all cases pass"
exit "$fail"
