-- Make users and rate_limits read-only for clients.
--
-- Both tables are server-owned: the Stripe webhook sets users.tier and
-- stripe_customer_id, and the Edge Functions change rate_limits through the
-- service-role RPCs from 003/008. Clients only read them (the extension reads
-- tier, the dashboard reads tier and today's count).
--
-- Before this migration a signed-in user could, through PostgREST with their
-- own JWT:
--   * PATCH their users row to tier = 'hosted_pro' (free Pro), via the
--     "users: update own row" policy from 002
--   * DELETE or UPDATE their rate_limits row to reset the daily quota, via the
--     "for all" policy from 001, which undid the lockdown in 009
--
-- Covered by supabase/tests/database/rls.test.sql.

drop policy if exists "users: update own row" on public.users;

drop policy if exists "rate_limits: own rows" on public.rate_limits;
create policy "rate_limits: select own rows" on public.rate_limits
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Table grants as a second layer, so a future permissive policy can't reopen
-- writes. service_role keeps its grants and bypasses RLS.
revoke all on public.users from anon, authenticated;
revoke all on public.rate_limits from anon, authenticated;
grant select on public.users to authenticated;
grant select on public.rate_limits to authenticated;
