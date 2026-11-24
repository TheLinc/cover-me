-- Client grants and owner-bound application links on the document tables (033).
-- Run: pnpm db:test   (from backend/)
begin;
select plan(32);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'alice@cover-me.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bob@cover-me.test'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'carol@cover-me.test');

insert into public.resumes (user_id, text_encrypted) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'alice-ciphertext');

insert into public.job_applications (id, user_id, title, company, url) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Engineer', 'Acme', 'https://example.com/a'),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Designer', 'Globex', 'https://example.com/b'),
  ('cccccccc-0000-4000-8000-000000000001', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Analyst', 'Initech', 'https://example.com/c');

insert into public.cover_letters (id, user_id, job_application_id, letter_encrypted) values
  ('aaaaaaaa-1111-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-000000000001', 'alice-letter');

insert into public.tailored_resumes (id, user_id, job_application_id, resume_json_encrypted) values
  ('aaaaaaaa-2222-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-000000000001', 'alice-tailored');


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

-- 033's cleanup, run with the FKs dropped so a crossed link can exist.
alter table public.cover_letters drop constraint cover_letters_job_application_id_fkey;
alter table public.tailored_resumes drop constraint tailored_resumes_job_application_id_fkey;
insert into public.cover_letters (id, user_id, job_application_id, letter_encrypted) values
  ('bbbbbbbb-1111-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bbbbbbbb-0000-4000-8000-000000000001', 'bob-letter'),
  ('bbbbbbbb-1111-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cccccccc-0000-4000-8000-000000000001', 'bob-crossed');
insert into public.tailored_resumes (id, user_id, job_application_id, resume_json_encrypted) values
  ('bbbbbbbb-2222-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cccccccc-0000-4000-8000-000000000001', 'bob-crossed');

update public.cover_letters cl
set job_application_id = null
where job_application_id is not null
  and not exists (
    select 1 from public.job_applications ja
    where ja.id = cl.job_application_id and ja.user_id = cl.user_id
  );

update public.tailored_resumes tr
set job_application_id = null
where job_application_id is not null
  and not exists (
    select 1 from public.job_applications ja
    where ja.id = tr.job_application_id and ja.user_id = tr.user_id
  );

select results_eq(
  $$select id, job_application_id from public.cover_letters where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' order by id$$,
  $$values ('bbbbbbbb-1111-4000-8000-000000000001'::uuid, 'bbbbbbbb-0000-4000-8000-000000000001'::uuid),
           ('bbbbbbbb-1111-4000-8000-000000000002'::uuid, null::uuid)$$,
  'the cleanup unlinks a cover letter from another user''s application and keeps its own link'
);
select is(
  (select job_application_id from public.tailored_resumes where id = 'bbbbbbbb-2222-4000-8000-000000000002'), null,
  'the cleanup unlinks a tailored resume from another user''s application'
);

select * from finish();
rollback;
