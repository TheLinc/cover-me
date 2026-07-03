-- Companion to check_and_increment_rate_limit: refunds a slot when a
-- generation that already consumed one fails downstream (missing resume,
-- Claude API error, malformed AI response, etc.) so failed generations
-- don't count against the user's daily quota.

create or replace function public.decrement_rate_limit(
  p_user_id uuid,
  p_date    date
)
returns void
language plpgsql
security definer
as $$
begin
  -- Lock the row so a concurrent increment can't be clobbered by this refund.
  update public.rate_limits
  set count = greatest(count - 1, 0)
  where user_id = p_user_id and date = p_date;
end;
$$;

-- NOTE: this function is locked down (EXECUTE revoked from client roles +
-- pinned search_path) in migration 009. The hardening lives there, not here,
-- so environments that already applied this migration pick it up on the next
-- `supabase db push` without a full reset.
