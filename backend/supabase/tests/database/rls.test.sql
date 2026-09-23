-- Row level security and cascade deletes.
-- Run: pnpm db:test   (from backend/)
--
-- Clients (extension, web dashboard) talk to PostgREST with the user's JWT, so
-- these policies are the only thing between a user and other users' data, or
-- between a free user and a free Pro upgrade.
begin;
select plan(16);

-- ── Fixtures (as postgres, bypassing RLS) ────────────────────────────────────

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'alice@cover-me.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bob@cover-me.test');

insert into public.resumes (user_id, text_encrypted) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'alice-ciphertext'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bob-ciphertext');

insert into public.job_applications (id, user_id, title, company, url) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Engineer', 'Acme', 'https://example.com/a'),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Designer', 'Globex', 'https://example.com/b');

insert into public.cover_letters (user_id, job_application_id, letter_encrypted) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-000000000001', 'alice-letter'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bbbbbbbb-0000-4000-8000-000000000001', 'bob-letter');

insert into public.tailored_resumes (user_id, job_application_id, resume_json_encrypted) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-000000000001', 'alice-tailored'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bbbbbbbb-0000-4000-8000-000000000001', 'bob-tailored');

insert into public.rate_limits (user_id, date, count) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', current_date, 5),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', current_date, 2);

-- ── Signup trigger ───────────────────────────────────────────────────────────

select is(
  (select tier from public.users where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'hosted_free', 'signup trigger creates a hosted_free users row'
);

-- Runs a write as the current role; an insufficient_privilege error counts
-- the same as a write that matched no rows.
create function pg_temp.try(sql text) returns void language plpgsql as $f$
begin
  execute sql;
exception when insufficient_privilege then null;
end $f$;

-- ── Act as Alice ─────────────────────────────────────────────────────────────

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);

select results_eq('select id from public.users', $$values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid)$$, 'users: sees only own row');
select results_eq('select text_encrypted from public.resumes', $$values ('alice-ciphertext')$$, 'resumes: sees only own row');
select results_eq('select company from public.job_applications', $$values ('Acme')$$, 'job_applications: sees only own rows');
select results_eq('select letter_encrypted from public.cover_letters', $$values ('alice-letter')$$, 'cover_letters: sees only own rows');
select results_eq('select resume_json_encrypted from public.tailored_resumes', $$values ('alice-tailored')$$, 'tailored_resumes: sees only own rows');
select results_eq('select count from public.rate_limits', $$values (5)$$, 'rate_limits: sees only own row (dashboard usage bar)');

-- Writes against Bob's rows match nothing under RLS.
update public.resumes set text_encrypted = 'pwned' where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
delete from public.job_applications where id = 'bbbbbbbb-0000-4000-8000-000000000001';

-- Privilege escalation: tier and the daily quota are server-owned. The Stripe
-- webhook and Edge Functions change them with the service key; a user must not.
select pg_temp.try($$update public.users set tier = 'hosted_pro' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$);
select pg_temp.try($$delete from public.rate_limits where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$);
select pg_temp.try($$update public.rate_limits set count = 0 where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$);
select pg_temp.try($$insert into public.rate_limits (user_id, date, count) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', current_date + 1, -100)$$);

-- ── Back to postgres to inspect the results ──────────────────────────────────

reset role;

select is((select text_encrypted from public.resumes where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 'bob-ciphertext', 'cannot update another user''s resume');
select is((select count(*)::int from public.job_applications where id = 'bbbbbbbb-0000-4000-8000-000000000001'), 1, 'cannot delete another user''s job application');
select is((select tier from public.users where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'hosted_free', 'cannot upgrade own tier to hosted_pro');
select is((select count from public.rate_limits where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and date = current_date), 5, 'cannot reset or delete own daily quota');
select is((select count(*)::int from public.rate_limits where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and date = current_date + 1), 0, 'cannot pre-seed own quota for another day');

-- ── Cascades (006, and auth.users → everything) ──────────────────────────────

delete from public.job_applications where id = 'aaaaaaaa-0000-4000-8000-000000000001';
select is((select count(*)::int from public.cover_letters where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 0, 'deleting a job application deletes its cover letters');
select is((select count(*)::int from public.tailored_resumes where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 0, 'deleting a job application deletes its tailored resumes');

delete from auth.users where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
select is((select count(*)::int from public.users where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 0, 'deleting an auth user deletes the users row');
select is(
  (select count(*)::int from public.resumes where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
  + (select count(*)::int from public.job_applications where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
  + (select count(*)::int from public.rate_limits where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  0, 'deleting an auth user deletes all their data'
);

select * from finish();
rollback;
