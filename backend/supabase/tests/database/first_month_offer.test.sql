-- The first-month offer (#213, migration 030): who has it open, and that it
-- starts once. Checkout and the limit message are covered in
-- tests/integration/billing.test.ts and generate.test.ts.
-- Run: pnpm db:test   (from backend/)
begin;
select plan(13);

select ok(not has_function_privilege('authenticated', 'public.first_month_offer_ends_at(uuid)', 'execute'),
  'signed-in users cannot read anyone''s offer');
select ok(not has_function_privilege('authenticated', 'public.open_first_month_offer(uuid)', 'execute'),
  'signed-in users cannot start an offer');

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'capped@offer.cover-me.test'),
  ('22222222-2222-4222-8222-222222222222', 'pro@offer.cover-me.test'),
  ('33333333-3333-4333-8333-333333333333', 'past-sub@offer.cover-me.test'),
  ('44444444-4444-4444-8444-444444444444', 'gift@offer.cover-me.test'),
  ('55555555-5555-4555-8555-555555555555', 'expired@offer.cover-me.test');

-- Starting it: opens a day later, so nothing is open yet.
select is(public.open_first_month_offer('11111111-1111-4111-8111-111111111111'), null,
  'a free user who just hit the limit has no offer open yet');
select is((select first_month_offer_at from public.users where id = '11111111-1111-4111-8111-111111111111'),
  now() + interval '1 day', 'it opens a day later');

-- A day on, it's open for 7 days from then.
update public.users set first_month_offer_at = now() - interval '1 hour'
  where id = '11111111-1111-4111-8111-111111111111';
select is(public.first_month_offer_ends_at('11111111-1111-4111-8111-111111111111'),
  now() - interval '1 hour' + interval '7 days', 'a capped free user has it open for 7 days');

-- Once per account: starting it again doesn't move it.
select is(public.open_first_month_offer('11111111-1111-4111-8111-111111111111'),
  now() - interval '1 hour' + interval '7 days', 'starting it again keeps the same window');
select is((select first_month_offer_at from public.users where id = '11111111-1111-4111-8111-111111111111'),
  now() - interval '1 hour', 'and leaves the start where it was');

-- Pro never gets it, and starting it does nothing.
update public.users set tier = 'hosted_pro' where id = '22222222-2222-4222-8222-222222222222';
select is(public.open_first_month_offer('22222222-2222-4222-8222-222222222222'), null, 'Pro users get no offer');
select is((select first_month_offer_at from public.users where id = '22222222-2222-4222-8222-222222222222'), null,
  'and no start date');

-- A past subscriber: the webhook set the tier back to free (013).
update public.users set first_month_offer_at = now() - interval '1 hour', tier_synced_at = now() - interval '30 days'
  where id = '33333333-3333-4333-8333-333333333333';
select is(public.first_month_offer_ends_at('33333333-3333-4333-8333-333333333333'), null,
  'a past subscriber gets no offer');

-- A gift trial counts as a subscription.
update public.users set first_month_offer_at = now() - interval '1 hour'
  where id = '44444444-4444-4444-8444-444444444444';
insert into public.trial_codes (code, expires_at, redeemed_by, redeemed_at)
  values ('offer-test-code', now() + interval '30 days', '44444444-4444-4444-8444-444444444444', now() - interval '20 days');
select is(public.first_month_offer_ends_at('44444444-4444-4444-8444-444444444444'), null,
  'someone who had a gift trial gets no offer');

-- After 7 days it's gone, and it never starts again.
update public.users set first_month_offer_at = now() - interval '7 days'
  where id = '55555555-5555-4555-8555-555555555555';
select is(public.first_month_offer_ends_at('55555555-5555-4555-8555-555555555555'), null,
  'the offer is gone after 7 days');
select is(public.open_first_month_offer('55555555-5555-4555-8555-555555555555'), null,
  'and hitting the limit again does not reopen it');

select * from finish();
rollback;
