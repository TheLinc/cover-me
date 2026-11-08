-- The one-day follow-up email (#113): one email, ever, to accounts that signed
-- up but never generated. The nudge function sends it and sets nudge_sent_at.
-- The 011 grants keep the column server-owned.
-- Covered by supabase/tests/database/signup_nudge.test.sql and
-- tests/integration/nudge.test.ts.
ALTER TABLE public.users ADD COLUMN nudge_sent_at timestamptz;

-- Who gets it today: created 24 hours to 7 days ago, never generated (only the
-- generation RPCs write rate_limits), not sent before, and can_email(...,
-- 'onboarding'), which means a confirmed address that hasn't unsubscribed.
-- Free accounts only: the email promises "10 free to start", and Pro
-- (including a gift trial) is a different conversation.
-- Oldest first; the cap keeps one run inside the Edge Function time limit, and
-- the rest go the next day.
CREATE FUNCTION public.nudge_candidates()
RETURNS TABLE (user_id uuid, email text, has_resume boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT u.id, a.email, EXISTS (SELECT 1 FROM public.resumes r WHERE r.user_id = u.id)
  FROM public.users u JOIN auth.users a ON a.id = u.id
  WHERE u.tier = 'hosted_free'
    AND u.created_at <= now() - interval '24 hours'
    AND u.created_at >= now() - interval '7 days'
    AND u.nudge_sent_at IS NULL
    AND a.email IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.rate_limits l WHERE l.user_id = u.id)
    AND public.can_email(u.id, 'onboarding')
  ORDER BY u.created_at
  LIMIT 100
$$;

REVOKE EXECUTE ON FUNCTION public.nudge_candidates() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nudge_candidates() TO service_role;
