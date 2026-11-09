-- Usage counts opt-out (#168). Hosted accounts' feature counts go to PostHog
-- by default (captureUsage in _shared/posthog.ts); a set time here stops all
-- of them for the account. Set with the service key when someone asks by
-- email. The 011 grants keep it server-owned: clients can read it, not write it.
-- Covered by supabase/tests/database/rls.test.sql and the tailor tests.
ALTER TABLE public.users ADD COLUMN usage_counts_opted_out_at timestamptz;
