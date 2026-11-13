-- The first-month offer (#213): a discount on the first month of monthly Pro
-- for a free account that hits the weekly limit or opens checkout without
-- subscribing. It becomes available a day later (first_month_offer_at), and
-- its 7 days start the first time it's shown (first_month_offer_shown_at), so
-- someone who comes back weeks later still gets the full 7. Once per account,
-- ever: both columns are set once and never cleared.
-- generate, tailor and billing call these only while the
-- STRIPE_FIRST_MONTH_COUPON_ID secret is set, so nothing starts before the
-- coupon exists. The 011 grants keep the columns server-owned.
-- Covered by supabase/tests/database/first_month_offer.test.sql and
-- tests/integration/billing.test.ts and generate.test.ts.
ALTER TABLE public.users ADD COLUMN first_month_offer_at timestamptz;
ALTER TABLE public.users ADD COLUMN first_month_offer_shown_at timestamptz;

-- Hitting the limit or leaving checkout: available a day from now, if it
-- never was. Pro gets nothing.
CREATE FUNCTION public.open_first_month_offer(p_user_id uuid)
RETURNS void LANGUAGE sql SET search_path = '' AS $$
  UPDATE public.users SET first_month_offer_at = now() + interval '1 day'
   WHERE id = p_user_id AND tier = 'hosted_free' AND first_month_offer_at IS NULL;
$$;

-- Showing it: starts the 7 days on the first showing, then returns when it
-- ends, or null if there's nothing to show. Never for Pro, or for anyone who
-- has had a subscription: the Stripe webhook sets tier_synced_at on every
-- subscription event (013), and a redeemed trial code is a gift trial.
-- billing also asks Stripe before it applies the coupon.
CREATE FUNCTION public.show_first_month_offer(p_user_id uuid)
RETURNS timestamptz LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_ends timestamptz;
BEGIN
  UPDATE public.users u SET first_month_offer_shown_at = coalesce(u.first_month_offer_shown_at, now())
   WHERE u.id = p_user_id
     AND u.tier = 'hosted_free'
     AND u.tier_synced_at IS NULL
     AND u.first_month_offer_at <= now()
     AND NOT EXISTS (SELECT 1 FROM public.trial_codes t WHERE t.redeemed_by = u.id)
  RETURNING u.first_month_offer_shown_at + interval '7 days' INTO v_ends;
  RETURN CASE WHEN now() < v_ends THEN v_ends END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.open_first_month_offer(uuid) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.show_first_month_offer(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_first_month_offer(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.show_first_month_offer(uuid) TO service_role;
