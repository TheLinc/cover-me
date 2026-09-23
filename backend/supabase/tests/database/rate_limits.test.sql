-- Rate limit functions (migrations 003, 008, 009).
-- Run: pnpm db:test   (from backend/)
begin;
select plan(14);

insert into auth.users (id, email)
values ('11111111-1111-4111-8111-111111111111', 'rl@cover-me.test');

-- ── check_and_increment_rate_limit ───────────────────────────────────────────

select ok(public.check_and_increment_rate_limit('11111111-1111-4111-8111-111111111111', '2026-01-01', 3), 'call 1 allowed');
select ok(public.check_and_increment_rate_limit('11111111-1111-4111-8111-111111111111', '2026-01-01', 3), 'call 2 allowed');
select ok(public.check_and_increment_rate_limit('11111111-1111-4111-8111-111111111111', '2026-01-01', 3), 'call 3 allowed');
select ok(not public.check_and_increment_rate_limit('11111111-1111-4111-8111-111111111111', '2026-01-01', 3), 'call 4 denied at limit');

select is(
  (select count from public.rate_limits where user_id = '11111111-1111-4111-8111-111111111111' and date = '2026-01-01'),
  3, 'a denied call does not increment the count'
);

select ok(public.check_and_increment_rate_limit('11111111-1111-4111-8111-111111111111', '2026-01-02', 3), 'a new day starts a fresh count');

-- ── decrement_rate_limit (refund) ────────────────────────────────────────────

select public.decrement_rate_limit('11111111-1111-4111-8111-111111111111', '2026-01-01');
select is(
  (select count from public.rate_limits where user_id = '11111111-1111-4111-8111-111111111111' and date = '2026-01-01'),
  2, 'refund gives one slot back'
);
select ok(public.check_and_increment_rate_limit('11111111-1111-4111-8111-111111111111', '2026-01-01', 3), 'refunded slot can be used again');

select public.decrement_rate_limit('11111111-1111-4111-8111-111111111111', '2026-01-02');
select public.decrement_rate_limit('11111111-1111-4111-8111-111111111111', '2026-01-02');
select is(
  (select count from public.rate_limits where user_id = '11111111-1111-4111-8111-111111111111' and date = '2026-01-02'),
  0, 'refund never takes the count below zero'
);

-- ── Lockdown (009): only the service role may call these ─────────────────────

select ok(
  not has_function_privilege('authenticated', 'public.check_and_increment_rate_limit(uuid, date, integer)', 'execute'),
  'authenticated cannot execute check_and_increment_rate_limit'
);
select ok(
  not has_function_privilege('authenticated', 'public.decrement_rate_limit(uuid, date)', 'execute'),
  'authenticated cannot execute decrement_rate_limit'
);
select ok(
  not has_function_privilege('anon', 'public.decrement_rate_limit(uuid, date)', 'execute'),
  'anon cannot execute decrement_rate_limit'
);
select ok(
  has_function_privilege('service_role', 'public.check_and_increment_rate_limit(uuid, date, integer)', 'execute'),
  'service_role can execute check_and_increment_rate_limit'
);
select is(
  (select proconfig from pg_proc where oid = 'public.decrement_rate_limit(uuid, date)'::regprocedure),
  array['search_path=""'], 'decrement_rate_limit has a pinned empty search_path'
);

select * from finish();
rollback;
