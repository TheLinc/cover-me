-- Lock down the SECURITY DEFINER rate-limit functions.
--
-- Postgres grants EXECUTE to PUBLIC on function creation, and Supabase exposes
-- public-schema functions via PostgREST to the anon/authenticated roles. Both
-- functions below are SECURITY DEFINER (they bypass RLS on rate_limits) and
-- trust the caller-supplied p_user_id. Without these revokes, an authenticated
-- user could call decrement_rate_limit directly to reset their own daily counter
-- and defeat the server-side 10/day cap. Only the service-role Edge Functions
-- (which use SERVICE_KEY) should be able to invoke them.
--
-- All statements are idempotent: revoking an already-revoked grant and re-setting
-- search_path are both no-ops, so this migration is safe whether or not the
-- functions were previously locked down.

revoke all on function public.decrement_rate_limit(uuid, date)
  from public, anon, authenticated;

revoke all on function public.check_and_increment_rate_limit(uuid, date, integer)
  from public, anon, authenticated;

-- Pin search_path so the SECURITY DEFINER context can't be hijacked via a
-- caller-controlled search_path pointing at shadowing objects. Both function
-- bodies reference public.rate_limits with the schema qualifier, so an empty
-- search_path is safe.
alter function public.decrement_rate_limit(uuid, date)
  set search_path = '';

alter function public.check_and_increment_rate_limit(uuid, date, integer)
  set search_path = '';
