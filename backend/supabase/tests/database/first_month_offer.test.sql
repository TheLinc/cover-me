-- The first-month offer (#213, migration 030): who can get it, that hitting
-- the limit only makes an account eligible a day later, and that the 7 days
-- start the first time it's shown. Checkout and the limit message are covered
-- in tests/integration/billing.test.ts and generate.test.ts.
-- Run: pnpm db:test   (from backend/)
begin;
select plan(16);

select ok(not has_function_privilege('authenticated', 'public.open_first_month_offer(uuid)', 'execute'),
  'signed-in users cannot start an offer');
select ok(not has_function_privilege('authenticated', 'public.show_first_month_offer(uuid)', 'execute'),
  'signed-in users cannot show one');

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'capped@offer.cover-me.test'),
  ('22222222-2222-4222-8222-222222222222', 'pro@offer.cover-me.test'),
  ('33333333-3333-4333-8333-333333333333', 'past-sub@offer.cover-me.test'),
  ('44444444-4444-4444-8444-444444444444', 'gift@offer.cover-me.test'),
  ('55555555-5555-4555-8555-555555555555', 'expired@offer.cover-me.test'),
  ('66666666-6666-4666-8666-666666666666', 'late@offer.cover-me.test');

-- Hitting the limit: eligible a day later, so nothing shows yet.
select public.open_first_month_offer('11111111-1111-4111-8111-111111111111');
select is((select first_month_offer_at from public.users where id = '11111111-1111-4111-8111-111111111111'),
  now() + interval '1 day', 'hitting the limit makes a free account eligible a day later');
select is(public.show_first_month_offer('11111111-1111-4111-8111-111111111111'), null,
  'nothing shows on the same day');
select is((select first_month_offer_shown_at from public.users where id = '11111111-1111-4111-8111-111111111111'), null,
  'and its 7 days have not started');

-- A day on: the first showing starts the 7 days.
update public.users set first_month_offer_at = now() - interval '1 hour'
  where id = '11111111-1111-4111-8111-111111111111';
select is(public.show_first_month_offer('11111111-1111-4111-8111-111111111111'), now() + interval '7 days',
  'the first time it shows, it has 7 days left');

-- Showing it again, or hitting the limit again, keeps the same window.
update public.users set first_month_offer_shown_at = now() - interval '2 days'
  where id = '11111111-1111-4111-8111-111111111111';
select is(public.show_first_month_offer('11111111-1111-4111-8111-111111111111'), now() + interval '5 days',
  'showing it again keeps the same end');
select public.open_first_month_offer('11111111-1111-4111-8111-111111111111');
select is((select first_month_offer_at from public.users where id = '11111111-1111-4111-8111-111111111111'),
  now() - interval '1 hour', 'hitting the limit again leaves it where it was');

-- Eligible long ago but never seen: still a full 7 days when it first shows.
update public.users set first_month_offer_at = now() - interval '60 days'
  where id = '66666666-6666-4666-8666-666666666666';
select is(public.show_first_month_offer('66666666-6666-4666-8666-666666666666'), now() + interval '7 days',
  'someone who comes back weeks later still gets 7 days');

-- Pro never gets it, and hitting a limit starts nothing.
update public.users set tier = 'hosted_pro' where id = '22222222-2222-4222-8222-222222222222';
select public.open_first_month_offer('22222222-2222-4222-8222-222222222222');
select is((select first_month_offer_at from public.users where id = '22222222-2222-4222-8222-222222222222'), null,
  'Pro users never become eligible');

-- A past subscriber: the webhook set the tier back to free (013).
update public.users set first_month_offer_at = now() - interval '1 hour', tier_synced_at = now() - interval '30 days'
  where id = '33333333-3333-4333-8333-333333333333';
select is(public.show_first_month_offer('33333333-3333-4333-8333-333333333333'), null,
  'a past subscriber gets no offer');
select is((select first_month_offer_shown_at from public.users where id = '33333333-3333-4333-8333-333333333333'), null,
  'and nothing is recorded as shown');

-- A gift trial counts as a subscription.
update public.users set first_month_offer_at = now() - interval '1 hour'
  where id = '44444444-4444-4444-8444-444444444444';
insert into public.trial_codes (code, expires_at, redeemed_by, redeemed_at)
  values ('offer-test-code', now() + interval '30 days', '44444444-4444-4444-8444-444444444444', now() - interval '20 days');
select is(public.show_first_month_offer('44444444-4444-4444-8444-444444444444'), null,
  'someone who had a gift trial gets no offer');

-- 7 days after it first showed, it's gone for good.
update public.users set first_month_offer_at = now() - interval '20 days', first_month_offer_shown_at = now() - interval '7 days'
  where id = '55555555-5555-4555-8555-555555555555';
select is(public.show_first_month_offer('55555555-5555-4555-8555-555555555555'), null,
  'the offer is gone 7 days after it first showed');
select public.open_first_month_offer('55555555-5555-4555-8555-555555555555');
select is(public.show_first_month_offer('55555555-5555-4555-8555-555555555555'), null,
  'and hitting the limit again does not bring it back');
select is((select first_month_offer_shown_at from public.users where id = '55555555-5555-4555-8555-555555555555'),
  now() - interval '7 days', 'its window stays where it was');

select * from finish();
rollback;
