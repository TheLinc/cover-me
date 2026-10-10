-- Fixes for Supabase's security and performance advisors (migration 016).
-- Run: pnpm db:test   (from backend/)
--
-- Row isolation itself is covered by rls.test.sql; this pins what the
-- advisors flagged so a later migration can't quietly undo it.
begin;
select plan(9);

-- ── handle_new_user: a trigger, never an API endpoint ─────────────────────────

select ok(not has_function_privilege('anon', 'public.handle_new_user()', 'execute'),
  'anon cannot call handle_new_user through /rest/v1/rpc');
select ok(not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute'),
  'signed-in users cannot call handle_new_user through /rest/v1/rpc');
select ok(
  (select proconfig from pg_proc where oid = 'public.handle_new_user()'::regprocedure) @> array['search_path=""'],
  'handle_new_user runs with an empty search_path');

-- Signing up must still create the public.users row.
insert into auth.users (id, email) values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'advisor-signup@cover-me.test');
select is((select email from public.users where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  'advisor-signup@cover-me.test', 'sign-up still creates the users row');

-- ── RLS policies: auth.uid() once per query, signed-in users only ─────────────

-- Every auth.uid() call must be a wrapped one: comparing counts also catches
-- a policy that wraps it in USING but not in WITH CHECK (or vice versa).
select is(
  (select count(*)::int from pg_policies
    where schemaname = 'public'
      and regexp_count(coalesce(qual, '') || coalesce(with_check, ''), 'auth\.uid\(\)')
       <> regexp_count(coalesce(qual, '') || coalesce(with_check, ''), 'SELECT auth\.uid\(\)')),
  0, 'no policy calls auth.uid() once per row');
select is(
  (select count(*)::int from pg_policies
    where schemaname = 'public' and roles @> array['public'::name]),
  0, 'no policy applies to anonymous callers');
select policies_are('public', 'resumes', array['resumes: own row'],
  'resumes keeps exactly its one policy');
select policies_are('public', 'cover_letters', array['cover_letters: own rows'],
  'cover_letters keeps exactly its one policy');

-- ── Index for Pro history (cover_letters filtered by user) ───────────────────

select has_index('public', 'cover_letters', 'cover_letters_user_id_idx',
  'cover_letters has an index on user_id');

select * from finish();
rollback;
