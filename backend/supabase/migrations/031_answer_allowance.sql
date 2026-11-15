-- Answers to application questions (#232) get their own allowance, so they
-- never use up letters or resumes:
--   Free: the first 5 answers, then 5 a week (Monday 00:00 UTC to Monday).
--   Pro:  a fair-use cap of 50 a day (UTC).
-- Starting numbers, to adjust after a month of answer_limit_hit counts. The
-- shape copies migration 015: answer_counts mirrors rate_limits (one row per
-- user per UTC day), and the functions mirror generation_allowance and
-- consume_generation. Answers stay out of rate_limits on purpose: the signup
-- nudge (024) and the removal email (027) read "never generated" from it.

create table public.answer_counts (
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  count integer not null default 0,
  primary key (user_id, date)
);

-- Server-only, like the trial codes in 021: RLS with no policies, and no
-- client grants. Only the Edge Functions (service role) read or write it.
alter table public.answer_counts enable row level security;
revoke all on public.answer_counts from anon, authenticated;

-- The one place the numbers live, now with the answer keys beside the letter ones.
create or replace function public.generation_limits()
returns jsonb
language sql
immutable
set search_path = ''
as $$ select '{"free_starter":10,"free_weekly":5,"pro_daily":25,"answer_starter":5,"answer_weekly":5,"answer_pro_daily":50}'::jsonb $$;

create or replace function public.answer_allowance(p_user_id uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_limits     jsonb := public.generation_limits();
  v_starter    int   := (v_limits->>'answer_starter')::int;
  v_weekly     int   := (v_limits->>'answer_weekly')::int;
  v_pro_daily  int   := (v_limits->>'answer_pro_daily')::int;
  v_today      date  := (now() at time zone 'utc')::date;
  v_week_start date  := date_trunc('week', v_today)::date;
  v_tier       text;
  v_lifetime   int;
  v_week       int;
  v_day        int;
  v_used       int;
  iso          text  := 'YYYY-MM-DD"T"HH24:MI:SS"Z"';
begin
  select tier into v_tier from public.users where id = p_user_id;
  select coalesce(sum(count), 0),
         coalesce(sum(count) filter (where date >= v_week_start), 0),
         coalesce(sum(count) filter (where date = v_today), 0)
    into v_lifetime, v_week, v_day
    from public.answer_counts where user_id = p_user_id;

  if v_tier = 'hosted_pro' then
    return jsonb_build_object('kind', 'daily', 'limit', v_pro_daily, 'used', v_day,
      'remaining', greatest(v_pro_daily - v_day, 0), 'allowed', v_day < v_pro_daily,
      'resets_at', to_char((v_today + 1)::timestamp, iso), 'pro_daily', v_pro_daily);
  end if;

  if v_lifetime < v_starter then
    return jsonb_build_object('kind', 'starter', 'limit', v_starter, 'used', v_lifetime,
      'remaining', v_starter - v_lifetime, 'allowed', true, 'resets_at', null, 'pro_daily', v_pro_daily);
  end if;

  -- Only answers past the starter count toward the week.
  v_used := least(v_week, v_lifetime - v_starter);
  return jsonb_build_object('kind', 'weekly', 'limit', v_weekly, 'used', v_used,
    'remaining', greatest(v_weekly - v_used, 0), 'allowed', v_used < v_weekly,
    'resets_at', to_char((v_week_start + 7)::timestamp, iso), 'pro_daily', v_pro_daily);
end;
$$;

create or replace function public.consume_answer(p_user_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v jsonb;
begin
  -- One consume at a time per user, so two tabs can't both take the last answer.
  perform 1 from public.users where id = p_user_id for update;
  v := public.answer_allowance(p_user_id);
  if (v->>'allowed')::boolean then
    insert into public.answer_counts (user_id, date, count)
    values (p_user_id, (now() at time zone 'utc')::date, 1)
    on conflict (user_id, date) do update set count = public.answer_counts.count + 1;
  end if;
  return v;
end;
$$;

-- Gives back an answer whose call failed after it was counted.
create or replace function public.refund_answer(p_user_id uuid, p_date date)
returns void
language sql
set search_path = ''
as $$
  update public.answer_counts set count = greatest(count - 1, 0)
  where user_id = p_user_id and date = p_date;
$$;

revoke all on function public.answer_allowance(uuid) from public, anon, authenticated;
revoke all on function public.consume_answer(uuid) from public, anon, authenticated;
revoke all on function public.refund_answer(uuid, date) from public, anon, authenticated;
