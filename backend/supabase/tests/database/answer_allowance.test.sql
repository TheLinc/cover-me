-- Answer allowance (migration 032, #232): free 5 to start then 5 a week,
-- Pro 50 a day, counted apart from letters and resumes. Run: pnpm db:test (from backend/)
begin;
select plan(16);

insert into auth.users (id, email) values
  ('31111111-1111-4111-8111-111111111111', 'answers-free@cover-me.test'),
  ('32222222-2222-4222-8222-222222222222', 'answers-pro@cover-me.test');
update public.users set tier = 'hosted_pro' where id = '32222222-2222-4222-8222-222222222222';

select is(public.generation_limits()->>'answer_starter', '5', 'answer numbers live with the letter numbers');

-- Starter
select is(public.answer_allowance('31111111-1111-4111-8111-111111111111')->>'kind', 'starter', 'a new free user starts on the answer starter');
select is((public.answer_allowance('31111111-1111-4111-8111-111111111111')->>'remaining')::int, 5, 'with 5 answers');
select ok((public.consume_answer('31111111-1111-4111-8111-111111111111')->>'allowed')::boolean, 'an answer within the starter is allowed');
select is((public.answer_allowance('31111111-1111-4111-8111-111111111111')->>'remaining')::int, 4, 'and counts');

-- Separate from letters and resumes, both ways
select is((select count(*)::int from public.rate_limits where user_id = '31111111-1111-4111-8111-111111111111'), 0, 'an answer uses no letter or resume');
insert into public.rate_limits (user_id, date, count) values ('31111111-1111-4111-8111-111111111111', (now() at time zone 'utc')::date, 30);
select is((public.answer_allowance('31111111-1111-4111-8111-111111111111')->>'remaining')::int, 4, 'letters and resumes use no answers');

-- Weekly window after the starter
update public.answer_counts set count = 10 where user_id = '31111111-1111-4111-8111-111111111111';
select is(public.answer_allowance('31111111-1111-4111-8111-111111111111')->>'kind', 'weekly', 'past 5 lifetime, the weekly window applies');
select ok(not (public.consume_answer('31111111-1111-4111-8111-111111111111')->>'allowed')::boolean, 'the 6th past-starter answer this week is refused');
select is((select count from public.answer_counts where user_id = '31111111-1111-4111-8111-111111111111'), 10, 'a refused answer does not count');

-- Refund
select public.refund_answer('31111111-1111-4111-8111-111111111111', (now() at time zone 'utc')::date);
select is((select count from public.answer_counts where user_id = '31111111-1111-4111-8111-111111111111'), 9, 'a refund gives one back');

-- Pro daily cap
insert into public.answer_counts (user_id, date, count) values ('32222222-2222-4222-8222-222222222222', (now() at time zone 'utc')::date, 49);
select ok((public.consume_answer('32222222-2222-4222-8222-222222222222')->>'allowed')::boolean, 'Pro: the 50th answer today is allowed');
select ok(not (public.consume_answer('32222222-2222-4222-8222-222222222222')->>'allowed')::boolean, 'Pro: the 51st is refused');

-- Lockdown: server only
select ok(not has_function_privilege('authenticated', 'public.consume_answer(uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.refund_answer(uuid, date)', 'execute')
  and not has_table_privilege('authenticated', 'public.answer_counts', 'insert, update, delete'),
  'clients cannot take, refund or edit answers');

-- The dashboard's read: the signed-in user's own allowance, and only that
select ok(has_function_privilege('authenticated', 'public.my_answer_allowance()', 'execute')
  and not has_function_privilege('anon', 'public.my_answer_allowance()', 'execute'),
  'signed-in users can read their own answer allowance');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"31111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
select is((public.my_answer_allowance()->>'remaining')::int, 1, 'my_answer_allowance reads the caller''s own');
reset role;

select * from finish();
rollback;
