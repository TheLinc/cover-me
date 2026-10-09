-- Relaunch pricing (2026-10-08), enforced server-side:
--   Free: the first 10 generations, then 5 a week (Monday 00:00 UTC to Monday).
--   Pro:  a fair-use cap of 25 a day (UTC).
-- Letters and tailored resumes count alike. Usage stays in rate_limits (one
-- row per user per UTC day); these functions derive the windows from it.
-- generation_limits() is the one place the numbers live: generate and tailor
-- consume through consume_generation(), the dashboard reads
-- my_generation_allowance(), and both report the limit they applied.
-- check_and_increment_rate_limit (003) stays until a later cleanup, so
-- functions still deploying keep working.

create or replace function public.generation_limits()
returns jsonb
language sql
immutable
set search_path = ''
as $$ select '{"free_starter":10,"free_weekly":5,"pro_daily":25}'::jsonb $$;

create or replace function public.generation_allowance(p_user_id uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_limits     jsonb := public.generation_limits();
  v_starter    int   := (v_limits->>'free_starter')::int;
  v_weekly     int   := (v_limits->>'free_weekly')::int;
  v_pro_daily  int   := (v_limits->>'pro_daily')::int;
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
    from public.rate_limits where user_id = p_user_id;

  if v_tier = 'hosted_pro' then
    return jsonb_build_object('kind', 'daily', 'limit', v_pro_daily, 'used', v_day,
      'remaining', greatest(v_pro_daily - v_day, 0), 'allowed', v_day < v_pro_daily,
      'resets_at', to_char((v_today + 1)::timestamp, iso), 'pro_daily', v_pro_daily);
  end if;

  if v_lifetime < v_starter then
    return jsonb_build_object('kind', 'starter', 'limit', v_starter, 'used', v_lifetime,
      'remaining', v_starter - v_lifetime, 'allowed', true, 'resets_at', null, 'pro_daily', v_pro_daily);
  end if;

  -- Only generations past the starter count toward the week, so finishing the
  -- starter on a Wednesday doesn't use up that week's allowance.
  v_used := least(v_week, v_lifetime - v_starter);
  return jsonb_build_object('kind', 'weekly', 'limit', v_weekly, 'used', v_used,
    'remaining', greatest(v_weekly - v_used, 0), 'allowed', v_used < v_weekly,
    'resets_at', to_char((v_week_start + 7)::timestamp, iso), 'pro_daily', v_pro_daily);
end;
$$;

create or replace function public.consume_generation(p_user_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v jsonb;
begin
  -- One consume at a time per user, so two tabs can't both take the last slot.
  perform 1 from public.users where id = p_user_id for update;
  v := public.generation_allowance(p_user_id);
  if (v->>'allowed')::boolean then
    insert into public.rate_limits (user_id, date, count)
    values (p_user_id, (now() at time zone 'utc')::date, 1)
    on conflict (user_id, date) do update set count = public.rate_limits.count + 1;
  end if;
  return v;
end;
$$;

create or replace function public.my_generation_allowance()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$ select public.generation_allowance(auth.uid()) $$;

revoke all on function public.generation_allowance(uuid) from public, anon, authenticated;
revoke all on function public.consume_generation(uuid) from public, anon, authenticated;
revoke all on function public.my_generation_allowance() from public, anon;
grant execute on function public.my_generation_allowance() to authenticated;
