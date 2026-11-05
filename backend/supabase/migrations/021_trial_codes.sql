-- Gift trial links: one free week of Pro each (#112). `pnpm trial-links`
-- makes the codes, the billing function's redeem action claims one.
-- Revoke an unused link by deleting its row.
--
-- redeemed_by is unique, so an account gets one gift trial ever. A deleted
-- account sets it to null, and redeemed_at keeps the code used.

create table public.trial_codes (
  code text primary key,
  note text,
  expires_at timestamptz not null,
  redeemed_by uuid unique references public.users (id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Server-only, like users and rate_limits in 011: RLS with no policies, and
-- no grants for clients. service_role bypasses both.
alter table public.trial_codes enable row level security;
revoke all on public.trial_codes from anon, authenticated;
