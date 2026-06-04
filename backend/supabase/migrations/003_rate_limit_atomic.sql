-- Atomic rate limit check-and-increment.
-- Checks whether the user is under the daily limit and increments in one
-- operation, eliminating the read-then-write race condition in the Edge Function.
-- Returns TRUE if the increment succeeded (generation is allowed),
-- FALSE if the limit is already reached (generation should be denied).

create or replace function public.check_and_increment_rate_limit(
  p_user_id uuid,
  p_date    date,
  p_limit   integer
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_count integer;
begin
  -- Lock existing row so concurrent calls queue up rather than both passing.
  select count into v_count
  from public.rate_limits
  where user_id = p_user_id and date = p_date
  for update;

  if v_count is null then
    -- First generation today — insert row with count 1.
    insert into public.rate_limits (user_id, date, count)
    values (p_user_id, p_date, 1)
    on conflict (user_id, date) do nothing;
    return true;
  elsif v_count < p_limit then
    -- Under limit — increment and allow.
    update public.rate_limits
    set count = count + 1
    where user_id = p_user_id and date = p_date;
    return true;
  else
    -- At or over limit — deny without touching the count.
    return false;
  end if;
end;
$$;
