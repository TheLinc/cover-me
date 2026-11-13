-- The first-month offer (#213): a discount on the first month of monthly Pro
-- for a free account that hits the weekly limit or opens checkout without
-- subscribing. It opens a day later and stays open for 7 days. Once per
-- account, ever: first_month_offer_at is set once and never cleared.
-- generate, tailor and billing start it, and only while the
-- STRIPE_FIRST_MONTH_COUPON_ID secret is set, so no window runs out before the
-- coupon exists. The 011 grants keep the column server-owned.
-- Covered by supabase/tests/database/first_month_offer.test.sql and
-- tests/integration/billing.test.ts and generate.test.ts.
ALTER TABLE public.users ADD COLUMN first_month_offer_at timestamptz;

-- When the offer ends if it's open now, else null. Never for Pro, or for
-- anyone who has had a subscription: the Stripe webhook sets tier_synced_at on
-- every subscription event (013), and a redeemed trial code is a gift trial.
-- billing also asks Stripe before it applies the coupon.
CREATE FUNCTION public.first_month_offer_ends_at(p_user_id uuid)
RETURNS timestamptz LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT u.first_month_offer_at + interval '7 days'
  FROM public.users u
  WHERE u.id = p_user_id
    AND u.tier = 'hosted_free'
    AND u.tier_synced_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.trial_codes t WHERE t.redeemed_by = u.id)
    AND u.first_month_offer_at <= now()
    AND now() < u.first_month_offer_at + interval '7 days'
$$;

-- Starts the offer a day from now if it never started, then returns when it
-- ends if it's open now (so a first call returns null).
CREATE FUNCTION public.open_first_month_offer(p_user_id uuid)
RETURNS timestamptz LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  UPDATE public.users SET first_month_offer_at = now() + interval '1 day'
   WHERE id = p_user_id AND tier = 'hosted_free' AND first_month_offer_at IS NULL;
  RETURN public.first_month_offer_ends_at(p_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.first_month_offer_ends_at(uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.open_first_month_offer(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.first_month_offer_ends_at(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.open_first_month_offer(uuid) TO service_role;
