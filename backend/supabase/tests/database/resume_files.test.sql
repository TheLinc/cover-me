-- resume_files (026): server-only, and gone with the account.
-- Run: pnpm db:test   (from backend/)
begin;
select plan(3);

insert into auth.users (id, email) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'alice@cover-me.test');
insert into public.resume_files (user_id, hash, docx_encrypted) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', repeat('a', 64), 'alice-docx');

select throws_ok($$insert into public.resume_files (user_id, hash, docx_encrypted) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'not-a-hash', 'x')$$,
  '23514', null, 'hash must be a SHA-256 in hex');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);
select throws_ok('select * from public.resume_files', '42501', null, 'a signed-in user cannot read even their own files');
reset role;

delete from auth.users where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select is((select count(*)::int from public.resume_files), 0, 'deleting the account deletes its files');

select * from finish();
rollback;
