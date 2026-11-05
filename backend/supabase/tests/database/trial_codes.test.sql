-- trial_codes (migration 021): gift trial links, server-only.
-- Run: pnpm db:test   (from backend/)
begin;
select plan(8);

insert into auth.users (id, email)
values ('ffffffff-ffff-4fff-8fff-ffffffffffff', 'fay@cover-me.test');
insert into public.trial_codes (code, note, expires_at)
values ('code-one', 'test', now() + interval '30 days'), ('code-two', 'test', now() + interval '30 days');

-- One gift trial per account, ever.
update public.trial_codes set redeemed_by = 'ffffffff-ffff-4fff-8fff-ffffffffffff', redeemed_at = now() where code = 'code-one';
select throws_ok(
  $$update public.trial_codes set redeemed_by = 'ffffffff-ffff-4fff-8fff-ffffffffffff', redeemed_at = now() where code = 'code-two'$$,
  '23505', null, 'an account can redeem only one code'
);

-- Deleting the account keeps the code used.
delete from auth.users where id = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
select ok((select redeemed_at is not null and redeemed_by is null from public.trial_codes where code = 'code-one'), 'a deleted account leaves its code redeemed');

select ok(not has_table_privilege('anon', 'public.trial_codes', 'select'), 'anon cannot read codes');
select ok(not has_table_privilege('authenticated', 'public.trial_codes', 'select'), 'signed-in users cannot read codes');
select ok(not has_table_privilege('authenticated', 'public.trial_codes', 'update'), 'signed-in users cannot claim codes');
select ok(not has_table_privilege('authenticated', 'public.trial_codes', 'insert'), 'signed-in users cannot make codes');

-- RLS as the second layer, in case a grant comes back.
select ok((select relrowsecurity from pg_class where oid = 'public.trial_codes'::regclass), 'row level security is on');
select is((select count(*)::int from pg_policies where tablename = 'trial_codes'), 0, 'no client policies');

select * from finish();
rollback;
