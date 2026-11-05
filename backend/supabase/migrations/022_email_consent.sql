-- Email consent (#114). Product-update emails are marketing, so they need an
-- opt-in on record and one unsubscribe that stops all non-account email.
-- Supabase Auth's own emails (confirm, reset, change email) don't look here.
--
-- product_updates*: the opt-in and its proof (when, and from where).
-- email_unsubscribed_at: set by the unsubscribe link; blocks every kind.
-- The 011 grants keep these server-owned: the email-preferences function
-- writes them with the service key.
-- Covered by supabase/tests/database/email_consent.test.sql.
ALTER TABLE public.users
  ADD COLUMN product_updates boolean NOT NULL DEFAULT false,
  ADD COLUMN product_updates_changed_at timestamptz,
  ADD COLUMN product_updates_source text
    CHECK (product_updates_source IN ('signup', 'dashboard', 'unsubscribe')),
  ADD COLUMN email_unsubscribed_at timestamptz;

-- Email signups send the box as user metadata ({ product_updates: true }), so
-- the choice is on record even when the confirmation link opens elsewhere.
-- Only a JSON true counts. Google signups can't carry it; the client sends it
-- to email-preferences once the session exists.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  opted boolean := coalesce(new.raw_user_meta_data->'product_updates' = 'true'::jsonb, false);
BEGIN
  INSERT INTO public.users (id, email, product_updates, product_updates_changed_at, product_updates_source)
  VALUES (new.id, new.email, opted, CASE WHEN opted THEN now() END, CASE WHEN opted THEN 'signup' END);
  RETURN new;
END;
$$;

-- Whether an address may get a kind of email: 'product_updates' or
-- 'onboarding'. Senders call this (_shared/email-consent.ts), never the
-- columns. Never to an unconfirmed address: anyone can sign up with someone
-- else's email and tick the box.
CREATE FUNCTION public.can_email(p_user_id uuid, p_kind text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce((
    SELECT u.email_unsubscribed_at IS NULL
      AND a.email_confirmed_at IS NOT NULL
      AND (p_kind = 'onboarding' OR (p_kind = 'product_updates' AND u.product_updates))
    FROM public.users u JOIN auth.users a ON a.id = u.id
    WHERE u.id = p_user_id
  ), false)
$$;

REVOKE EXECUTE ON FUNCTION public.can_email(uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_email(uuid, text) TO service_role;
