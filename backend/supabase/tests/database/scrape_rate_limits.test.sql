-- Per-IP rate limit for the scrape function (migration 014).
-- Run: pnpm db:test   (from backend/)
begin;
select plan(11);

-- ── Minute window ─────────────────────────────────────────────────────────────

select ok(public.check_scrape_rate_limit('ip-a', 2, 100), 'call 1 allowed');
select ok(public.check_scrape_rate_limit('ip-a', 2, 100), 'call 2 allowed');
select ok(not public.check_scrape_rate_limit('ip-a', 2, 100), 'call 3 denied over the per-minute limit');
select ok(public.check_scrape_rate_limit('ip-b', 2, 100), 'another IP has its own count');

-- Roll ip-a's minute window into the past: the next call starts a new one.
update public.scrape_rate_limits set window_start = window_start - interval '1 minute'
where ip_hash = 'ip-a' and window_kind = 'minute';
select ok(public.check_scrape_rate_limit('ip-a', 2, 100), 'a new minute starts a fresh count');
select is(
  (select count from public.scrape_rate_limits where ip_hash = 'ip-a' and window_kind = 'minute'),
  1, 'the rolled-over window was reset, not added to'
);

-- ── Day window ────────────────────────────────────────────────────────────────

select ok(public.check_scrape_rate_limit('ip-c', 100, 1), 'first call of the day allowed');
select ok(not public.check_scrape_rate_limit('ip-c', 100, 1), 'denied over the per-day limit even within the minute limit');

-- ── Lockdown: only the service role ───────────────────────────────────────────

select ok(
  not has_function_privilege('anon', 'public.check_scrape_rate_limit(text, integer, integer)', 'execute')
  and not has_function_privilege('authenticated', 'public.check_scrape_rate_limit(text, integer, integer)', 'execute'),
  'anon and authenticated cannot execute check_scrape_rate_limit'
);
select ok(
  has_function_privilege('service_role', 'public.check_scrape_rate_limit(text, integer, integer)', 'execute'),
  'service_role can execute check_scrape_rate_limit'
);
select ok(
  not has_table_privilege('anon', 'public.scrape_rate_limits', 'select')
  and not has_table_privilege('authenticated', 'public.scrape_rate_limits', 'select'),
  'clients cannot read scrape_rate_limits'
);

select * from finish();
rollback;
