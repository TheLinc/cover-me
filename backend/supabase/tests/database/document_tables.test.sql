-- Client grants and owner-bound application links on the document tables (033).
-- Run: pnpm db:test   (from backend/)
begin;
select plan(30);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'alice@cover-me.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bob@cover-me.test');

insert into public.resumes (user_id, text_encrypted) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'alice-ciphertext');

insert into public.job_applications (id, user_id, title, company, url) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Engineer', 'Acme', 'https://example.com/a'),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Designer', 'Globex', 'https://example.com/b');

insert into public.cover_letters (id, user_id, job_application_id, letter_encrypted) values
  ('aaaaaaaa-1111-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-000000000001', 'alice-letter');

insert into public.tailored_resumes (id, user_id, job_application_id, resume_json_encrypted) values
  ('aaaaaaaa-2222-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-000000000001', 'alice-tailored');

-- ── No client grants ─────────────────────────────────────────────────────────

select ok(
  not exists (
    select 1
    from unnest(array['anon', 'authenticated']) r(role),
         unnest(array['public.resumes', 'public.cover_letters', 'public.job_applications', 'public.tailored_resumes']) t(tbl),
         unnest(array['select', 'insert', 'update', 'delete', 'truncate', 'references', 'trigger']) p(priv)
    where has_table_privilege(r.role, t.tbl, p.priv)
  ),
  'anon and authenticated hold no privileges on the document tables'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);

select throws_ok($$select 1 from public.resumes$$, '42501', null, 'authenticated cannot read resumes');
select throws_ok($$select 1 from public.cover_letters$$, '42501', null, 'authenticated cannot read cover_letters');
select throws_ok($$select 1 from public.job_applications$$, '42501', null, 'authenticated cannot read job_applications');
select throws_ok($$select 1 from public.tailored_resumes$$, '42501', null, 'authenticated cannot read tailored_resumes');

select throws_ok($$insert into public.resumes (user_id, text_encrypted) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'x')$$,
  '42501', null, 'authenticated cannot insert into resumes');
select throws_ok($$insert into public.job_applications (user_id, title) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'x')$$,
  '42501', null, 'authenticated cannot insert into job_applications');
select throws_ok($$insert into public.cover_letters (user_id, letter_encrypted) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'x')$$,
  '42501', null, 'authenticated cannot insert into cover_letters');
select throws_ok($$insert into public.tailored_resumes (user_id, resume_json_encrypted) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'x')$$,
  '42501', null, 'authenticated cannot insert into tailored_resumes');

select throws_ok($$update public.resumes set text_encrypted = 'x'$$, '42501', null, 'authenticated cannot update resumes');
select throws_ok($$update public.job_applications set title = 'x'$$, '42501', null, 'authenticated cannot update job_applications');
select throws_ok($$update public.cover_letters set letter_encrypted = 'x'$$, '42501', null, 'authenticated cannot update cover_letters');
select throws_ok($$update public.tailored_resumes set resume_json_encrypted = 'x'$$, '42501', null, 'authenticated cannot update tailored_resumes');

select throws_ok($$delete from public.resumes$$, '42501', null, 'authenticated cannot delete resumes');
select throws_ok($$delete from public.job_applications$$, '42501', null, 'authenticated cannot delete job_applications');
select throws_ok($$delete from public.cover_letters$$, '42501', null, 'authenticated cannot delete cover_letters');
select throws_ok($$delete from public.tailored_resumes$$, '42501', null, 'authenticated cannot delete tailored_resumes');

reset role;

-- ── Application links stay with their owner, even for the service role ───────

set local role service_role;

select throws_ok(
  $$insert into public.cover_letters (user_id, job_application_id, letter_encrypted)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-0000-4000-8000-000000000001', 'x')$$,
  '23503', null, 'a cover letter cannot link to another user''s application'
);
select throws_ok(
  $$insert into public.tailored_resumes (user_id, job_application_id, resume_json_encrypted)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-0000-4000-8000-000000000001', 'x')$$,
  '23503', null, 'a tailored resume cannot link to another user''s application'
);
select throws_ok(
  $$update public.cover_letters set job_application_id = 'bbbbbbbb-0000-4000-8000-000000000001'
    where id = 'aaaaaaaa-1111-4000-8000-000000000001'$$,
  '23503', null, 'a cover letter cannot be moved to another user''s application'
);
select throws_ok(
  $$update public.tailored_resumes set job_application_id = 'bbbbbbbb-0000-4000-8000-000000000001'
    where id = 'aaaaaaaa-2222-4000-8000-000000000001'$$,
  '23503', null, 'a tailored resume cannot be moved to another user''s application'
);
select throws_ok(
  $$update public.cover_letters set user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    where id = 'aaaaaaaa-1111-4000-8000-000000000001'$$,
  '23503', null, 'a linked cover letter cannot change owner away from its application'
);

select lives_ok(
  $$insert into public.cover_letters (user_id, job_application_id, letter_encrypted)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-000000000001', 'alice-letter-2')$$,
  'a cover letter can link to its owner''s application'
);
select lives_ok(
  $$insert into public.tailored_resumes (user_id, job_application_id, resume_json_encrypted)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-000000000001', 'alice-tailored-2')$$,
  'a tailored resume can link to its owner''s application'
);
select lives_ok(
  $$insert into public.cover_letters (user_id, job_application_id, letter_encrypted)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', null, 'alice-unlinked')$$,
  'a cover letter can have no application'
);
select lives_ok(
  $$insert into public.tailored_resumes (user_id, job_application_id, resume_json_encrypted)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', null, 'alice-unlinked')$$,
  'a tailored resume can have no application'
);

reset role;

-- ── Cascades still follow the application ────────────────────────────────────

delete from public.job_applications where id = 'aaaaaaaa-0000-4000-8000-000000000001';
select is((select count(*)::int from public.cover_letters where job_application_id is not null), 0,
  'deleting an application deletes its cover letters');
select is((select count(*)::int from public.tailored_resumes where job_application_id is not null), 0,
  'deleting an application deletes its tailored resumes');
select is((select count(*)::int from public.cover_letters where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 1,
  'an unlinked cover letter survives the delete');

delete from auth.users where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select is(
  (select count(*)::int from public.cover_letters where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
  + (select count(*)::int from public.tailored_resumes where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  0, 'deleting the user deletes their remaining documents'
);

select * from finish();
rollback;
