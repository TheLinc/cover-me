-- Funnel view: counts only, never readable by clients.
-- Run: pnpm db:test   (from backend/)
begin;
select plan(3);

create temp table funnel_before as
  select coalesce(sum(signups), 0)::int as s, coalesce(sum(activated), 0)::int as a from public.funnel_weekly;

insert into auth.users (id, email) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'carol@cover-me.test'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'dan@cover-me.test');
insert into public.rate_limits (user_id, date, count) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', current_date, 2);

select ok(not has_table_privilege('anon', 'public.funnel_weekly', 'select'), 'anon cannot read the funnel');
select ok(not has_table_privilege('authenticated', 'public.funnel_weekly', 'select'), 'signed-in users cannot read the funnel');
select results_eq(
  $$ select (sum(signups) - (select s from funnel_before))::int, (sum(activated) - (select a from funnel_before))::int
     from public.funnel_weekly $$,
  $$ values (2, 1) $$,
  'two new signups, one of them activated'
);

select * from finish();
rollback;
