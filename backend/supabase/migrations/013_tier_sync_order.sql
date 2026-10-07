-- The Stripe webhook reads a customer's subscriptions from Stripe, then writes
-- the tier. Two events handled at the same moment can finish in the wrong
-- order: the handler that read "active" before a cancel writes last and
-- restores Pro. Each write now carries the time it read Stripe, and a write
-- older than the last one is ignored.

alter table public.users add column tier_synced_at timestamptz;

create function public.set_tier_if_newer(p_customer_id text, p_tier text, p_read_at timestamptz)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.users
     set tier = p_tier, tier_synced_at = p_read_at
   where stripe_customer_id = p_customer_id
     and (tier_synced_at is null or tier_synced_at < p_read_at);
$$;

-- Only the webhook (service key) may call it. See 009 for why the revoke matters.
revoke all on function public.set_tier_if_newer(text, text, timestamptz) from public, anon, authenticated;
