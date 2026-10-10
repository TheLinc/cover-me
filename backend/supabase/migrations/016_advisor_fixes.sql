-- Fixes for Supabase's security and performance advisors (2026-10-10).
-- No API shape changes: the published extension and the dashboard behave the same.

-- ── handle_new_user: a trigger, never an API endpoint ─────────────────────────
-- SECURITY DEFINER functions in public are callable at /rest/v1/rpc/<name>.
-- Calling a trigger function directly fails anyway, but nobody should reach it.
-- Triggers fire without an EXECUTE check, so sign-up is unaffected. The body
-- already uses schema-qualified names, so an empty search_path is safe.
alter function public.handle_new_user() set search_path = '';
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- rls_auto_enable is Supabase's own event-trigger function (the ensure_rls
-- event trigger), not ours, and may not exist on every stack. Event triggers
-- run regardless of EXECUTE grants.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;

-- ── RLS: auth.uid() once per query, signed-in users only ─────────────────────
-- (select auth.uid()) is evaluated once as an initplan instead of per row.
-- Scoped to authenticated: anon's auth.uid() is null, so it matched nothing
-- before either; the service key bypasses RLS. Same names, same row rules.

drop policy "resumes: own row" on public.resumes;
create policy "resumes: own row" on public.resumes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy "cover_letters: own rows" on public.cover_letters;
create policy "cover_letters: own rows" on public.cover_letters
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy "job_applications: own rows" on public.job_applications;
create policy "job_applications: own rows" on public.job_applications
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy "tailored_resumes: own rows" on public.tailored_resumes;
create policy "tailored_resumes: own rows" on public.tailored_resumes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- users is select-only for clients since migration 011.
drop policy "users: select own row" on public.users;
create policy "users: select own row" on public.users
  for select to authenticated
  using ((select auth.uid()) = id);

-- ── Index: Pro history reads cover_letters by user ───────────────────────────
create index if not exists cover_letters_user_id_idx on public.cover_letters (user_id);
