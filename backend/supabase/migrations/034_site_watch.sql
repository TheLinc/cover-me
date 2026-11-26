-- "Email me when Cover Me reads this site" (#195): signed-in users who asked
-- to hear when a requested job site is supported. site-request writes rows,
-- site-watch emails them and deletes them. Server-owned like 033: only the
-- Edge Functions touch it, with the service key.
--
-- Covered by supabase/tests/database/site_watch.test.sql.
create table public.site_watch (
  host text not null check (char_length(host) <= 253),
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (host, user_id)
);

alter table public.site_watch enable row level security;
revoke all on public.site_watch from anon, authenticated;

-- The privacy policy promises rows nobody acted on are gone after 12 months.
create extension if not exists pg_cron;
select cron.schedule(
  'site-watch-expiry',
  '23 4 * * *',
  $$delete from public.site_watch where created_at < now() - interval '12 months'$$
);
