-- Generation allowance (migration 015): free 10 to start then 5 a week,
-- Pro 25 a day. Run: pnpm db:test (from backend/)
begin;
select plan(17);

insert into auth.users (id, email) values
  ('21111111-1111-4111-8111-111111111111', 'allowance-free@cover-me.test'),
  ('22222222-2222-4222-8222-222222222222', 'allowance-pro@cover-me.test'),
  ('23333333-3333-4333-8333-333333333333', 'allowance-lapsed@cover-me.test');
-- public.users rows come from the signup trigger; set the tiers.
update public.users set tier = 'hosted_pro' where id = '22222222-2222-4222-8222-222222222222';

select is(public.generation_limits(), '{"free_starter":10,"free_weekly":5,"pro_daily":25}'::jsonb, 'limits live in one place');

-- Starter
select is(public.generation_allowance('21111111-1111-4111-8111-111111111111')->>'kind', 'starter', 'a new free user is on the starter allowance');
select is((public.generation_allowance('21111111-1111-4111-8111-111111111111')->>'remaining')::int, 10, 'with 10 left');
select ok((public.consume_generation('21111111-1111-4111-8111-111111111111')->>'allowed')::boolean, 'consuming within the starter is allowed');
select is((public.generation_allowance('21111111-1111-4111-8111-111111111111')->>'remaining')::int, 9, 'and counts');

-- Starter finished mid-week: only generations past the first 10 count toward the week.
delete from public.rate_limits where user_id = '21111111-1111-4111-8111-111111111111';
insert into public.rate_limits (user_id, date, count) values
  ('21111111-1111-4111-8111-111111111111', (now() at time zone 'utc')::date, 12);
select is(public.generation_allowance('21111111-1111-4111-8111-111111111111')->>'kind', 'weekly', 'past 10 lifetime, the weekly window applies');
select is((public.generation_allowance('21111111-1111-4111-8111-111111111111')->>'used')::int, 2, 'only the 2 past the starter count toward this week');
select is((public.generation_allowance('21111111-1111-4111-8111-111111111111')->>'remaining')::int, 3, 'leaving 3');

-- Weekly limit and the week boundary
update public.rate_limits set count = 15 where user_id = '21111111-1111-4111-8111-111111111111';
select ok(not (public.consume_generation('21111111-1111-4111-8111-111111111111')->>'allowed')::boolean, 'the 6th past-starter generation this week is refused');
select is((select count from public.rate_limits where user_id = '21111111-1111-4111-8111-111111111111'), 15, 'a refused call does not count');
update public.rate_limits set date = date_trunc('week', (now() at time zone 'utc')::date)::date - 1
  where user_id = '21111111-1111-4111-8111-111111111111';
select ok((public.consume_generation('21111111-1111-4111-8111-111111111111')->>'allowed')::boolean, 'usage from last Sunday does not count against this week');
select is(public.generation_allowance('21111111-1111-4111-8111-111111111111')->>'resets_at',
  to_char((date_trunc('week', (now() at time zone 'utc')::date)::date + 7)::timestamp, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'the weekly window resets next Monday 00:00 UTC');

-- Pro daily cap
insert into public.rate_limits (user_id, date, count) values ('22222222-2222-4222-8222-222222222222', (now() at time zone 'utc')::date, 24);
select ok((public.consume_generation('22222222-2222-4222-8222-222222222222')->>'allowed')::boolean, 'Pro: the 25th today is allowed');
select ok(not (public.consume_generation('22222222-2222-4222-8222-222222222222')->>'allowed')::boolean, 'Pro: the 26th today is refused');

-- A lapsed Pro user is on free rules with their whole history
insert into public.rate_limits (user_id, date, count) values ('23333333-3333-4333-8333-333333333333', (now() at time zone 'utc')::date - 30, 40);
select is(public.generation_allowance('23333333-3333-4333-8333-333333333333')->>'kind', 'weekly', 'a free user with 40 lifetime generations is on the weekly window');

-- Lockdown
select ok(not has_function_privilege('authenticated', 'public.consume_generation(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.consume_generation(uuid)', 'execute'), 'clients cannot consume');
select ok(has_function_privilege('authenticated', 'public.my_generation_allowance()', 'execute')
  and not has_function_privilege('anon', 'public.my_generation_allowance()', 'execute'), 'signed-in users can read their own allowance');

select * from finish();
rollback;
