-- Per-IP rate limit for the scrape Edge Function, which takes calls without an
-- account (BYOK users have none). Keyed by an HMAC of the IP, never the IP.
-- Two fixed windows per IP, a minute and a day, each one row that is reset
-- when its window rolls over. Over either limit the function answers 429 and
-- the extension falls back to its bundled scrapers, so a shared IP (office,
-- campus, carrier NAT) that hits it still gets a result.

create table public.scrape_rate_limits (
  ip_hash      text        not null,
  window_kind  text        not null check (window_kind in ('minute', 'day')),
  window_start timestamptz not null,
  count        integer     not null,
  primary key (ip_hash, window_kind)
);

create index scrape_rate_limits_window_start_idx on public.scrape_rate_limits (window_start);

-- No policies: only the service role, which bypasses RLS, touches it.
alter table public.scrape_rate_limits enable row level security;
revoke all on public.scrape_rate_limits from anon, authenticated;

-- Counts the call in both windows and returns whether it's within both
-- limits. Denied calls count too, so an IP that keeps hammering stays blocked.
-- The upserts are atomic, so concurrent calls can't share a count.
create or replace function public.check_scrape_rate_limit(
  p_ip_hash    text,
  p_per_minute integer,
  p_per_day    integer
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_minute integer;
  v_day    integer;
begin
  insert into public.scrape_rate_limits as r (ip_hash, window_kind, window_start, count)
  values (p_ip_hash, 'minute', date_trunc('minute', now()), 1)
  on conflict (ip_hash, window_kind) do update
    set count        = case when r.window_start = excluded.window_start then r.count + 1 else 1 end,
        window_start = excluded.window_start
  returning count into v_minute;

  insert into public.scrape_rate_limits as r (ip_hash, window_kind, window_start, count)
  values (p_ip_hash, 'day', date_trunc('day', now()), 1)
  on conflict (ip_hash, window_kind) do update
    set count        = case when r.window_start = excluded.window_start then r.count + 1 else 1 end,
        window_start = excluded.window_start
  returning count into v_day;

  -- Rows of IPs not seen for two days, pruned now and then instead of by a job.
  if random() < 0.01 then
    delete from public.scrape_rate_limits where window_start < now() - interval '2 days';
  end if;

  return v_minute <= p_per_minute and v_day <= p_per_day;
end;
$$;

revoke all on function public.check_scrape_rate_limit(text, integer, integer)
  from public, anon, authenticated;
