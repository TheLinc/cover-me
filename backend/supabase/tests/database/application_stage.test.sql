-- Application stages (020): the default, the CHECK, the copy of the old
-- "got an interview" marks, and RLS on a stage change.
-- Run: pnpm db:test   (from backend/)
begin;
select plan(7);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'alice@cover-me.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bob@cover-me.test');

insert into public.job_applications (id, user_id, title, company, url) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Engineer', 'Acme', 'https://example.com/a'),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Designer', 'Globex', 'https://example.com/b');

select is(
  (select stage from public.job_applications where id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  'applied', 'a new application starts in applied'
);
select is(
  (select stage_changed_at from public.job_applications where id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  null, 'stage_changed_at stays null until the stage is changed'
);
select throws_ok(
  $$update public.job_applications set stage = 'saved' where id = 'aaaaaaaa-0000-4000-8000-000000000001'$$,
  '23514', null, 'the CHECK rejects a stage outside the four'
);

-- The copy of the interview marks: put Bob's row back the way it was before
-- 020 (marked, still applied), then run 020's own UPDATE as the CLI recorded it.
update public.job_applications set interview_at = '2026-10-20 12:00+00'
  where id = 'bbbbbbbb-0000-4000-8000-000000000001';
do $$
declare s text;
begin
  select stmt into strict s
    from supabase_migrations.schema_migrations, unnest(statements) stmt
    where version = '020' and stmt ilike '%update public.job_applications%';
  execute s;
end $$;
select is(
  (select stage from public.job_applications where id = 'bbbbbbbb-0000-4000-8000-000000000001'),
  'interviewing', 'an application marked "got an interview" becomes interviewing'
);
select is(
  (select stage_changed_at from public.job_applications where id = 'bbbbbbbb-0000-4000-8000-000000000001'),
  '2026-10-20 12:00+00'::timestamptz, 'and its stage date is the date of the mark'
);
select is(
  (select stage from public.job_applications where id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  'applied', 'an unmarked application stays applied'
);

-- RLS: Alice can't move Bob's application.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);
update public.job_applications set stage = 'closed' where id = 'bbbbbbbb-0000-4000-8000-000000000001';
reset role;
select is(
  (select stage from public.job_applications where id = 'bbbbbbbb-0000-4000-8000-000000000001'),
  'interviewing', 'cannot change another user''s stage'
);

select * from finish();
rollback;
