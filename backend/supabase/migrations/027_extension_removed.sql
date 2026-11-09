-- The follow-up email skips accounts whose extension was removed (#126): its
-- copy tells them to click the extension's icon. The uninstall page sets the
-- mark through the extension-removed function, and any signed-in call to the
-- resume function (every extension sign-in makes one) clears it. The 011
-- grants keep the column server-owned.
-- Covered by supabase/tests/database/signup_nudge.test.sql and
-- tests/integration/extension-removed.test.ts.
ALTER TABLE public.users ADD COLUMN extension_removed_at timestamptz;

-- As in 024, plus the new filter. CREATE OR REPLACE keeps 024's grants.
CREATE OR REPLACE FUNCTION public.nudge_candidates()
RETURNS TABLE (user_id uuid, email text, has_resume boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT u.id, a.email, EXISTS (SELECT 1 FROM public.resumes r WHERE r.user_id = u.id)
  FROM public.users u JOIN auth.users a ON a.id = u.id
  WHERE u.tier = 'hosted_free'
    AND u.created_at <= now() - interval '24 hours'
    AND u.created_at >= now() - interval '7 days'
    AND u.nudge_sent_at IS NULL
    AND u.extension_removed_at IS NULL
    AND a.email IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.rate_limits l WHERE l.user_id = u.id)
    AND public.can_email(u.id, 'onboarding')
  ORDER BY u.created_at
  LIMIT 100
$$;
