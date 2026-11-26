-- site_watch (migration 034): who asked to hear when a job site works, server-only.
-- Run: pnpm db:test   (from backend/)
begin;
select plan(9);

insert into auth.users (id, email)
values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'eve@cover-me.test');
insert into public.site_watch (host, user_id) values ('jobs.acme.com', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');

select throws_ok(
  $$insert into public.site_watch (host, user_id) values ('jobs.acme.com', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')$$,
  '23505', null, 'one row per account and site'
);

delete from auth.users where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
select is((select count(*)::int from public.site_watch), 0, 'deleting the account deletes its rows');

select ok(not has_table_privilege('anon', 'public.site_watch', 'select'), 'anon cannot read rows');
select ok(not has_table_privilege('anon', 'public.site_watch', 'insert'), 'anon cannot add rows');
select ok(not has_table_privilege('authenticated', 'public.site_watch', 'select'), 'signed-in users cannot read rows');
select ok(not has_table_privilege('authenticated', 'public.site_watch', 'insert'), 'signed-in users cannot add rows');

select ok((select relrowsecurity from pg_class where oid = 'public.site_watch'::regclass), 'row level security is on');
select is((select count(*)::int from pg_policies where tablename = 'site_watch'), 0, 'no client policies');

select is(
  (select command from cron.job where jobname = 'site-watch-expiry'),
  $$delete from public.site_watch where created_at < now() - interval '12 months'$$,
  'a daily job deletes rows older than 12 months'
);

select * from finish();
rollback;
