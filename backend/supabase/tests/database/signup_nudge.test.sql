-- The one-day follow-up (migration 024). Who gets it is covered end to end in
-- tests/integration/nudge.test.ts; this checks only that it stays server-side:
-- the candidate list holds email addresses.
-- Run: pnpm db:test   (from backend/)
begin;
select plan(2);

select ok(not has_function_privilege('anon', 'public.nudge_candidates()', 'execute'),
  'anyone without an account cannot list who gets the follow-up');
select ok(not has_function_privilege('authenticated', 'public.nudge_candidates()', 'execute'),
  'signed-in users cannot list who gets the follow-up');

select * from finish();
rollback;
