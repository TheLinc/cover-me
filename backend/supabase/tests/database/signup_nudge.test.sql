-- The one-day follow-up (migrations 024 and 027). Who gets it is covered end
-- to end in tests/integration/nudge.test.ts; this checks that it stays
-- server-side (the candidate list holds email addresses) and that it skips an
-- account whose extension was removed.
-- Run: pnpm db:test   (from backend/)
begin;
select plan(4);

select ok(not has_function_privilege('anon', 'public.nudge_candidates()', 'execute'),
  'anyone without an account cannot list who gets the follow-up');
select ok(not has_function_privilege('authenticated', 'public.nudge_candidates()', 'execute'),
  'signed-in users cannot list who gets the follow-up');

-- A confirmed free account two days old that never generated: a candidate.
insert into auth.users (id, email, email_confirmed_at) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'removed@cover-me.test', now());
update public.users set created_at = now() - interval '48 hours'
  where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select ok(exists (select 1 from public.nudge_candidates() where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'a two-day-old account that never generated gets the follow-up');

update public.users set extension_removed_at = now()
  where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select ok(not exists (select 1 from public.nudge_candidates() where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'an account whose extension was removed does not');

select * from finish();
rollback;
