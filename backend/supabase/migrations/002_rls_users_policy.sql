-- Tighten the users table RLS policy.
-- The original "for all" allowed authenticated users to INSERT their own row,
-- which is harmless but unnecessary — the handle_new_user() trigger owns that.
-- Replace with explicit select + update only.

drop policy if exists "users: own row" on public.users;

create policy "users: select own row" on public.users
  for select using (auth.uid() = id);

create policy "users: update own row" on public.users
  for update using (auth.uid() = id);
