-- set_tier_if_newer (migration 013): the Stripe webhook's tier write.
-- Run: pnpm db:test   (from backend/)
begin;
select plan(6);

insert into auth.users (id, email)
values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'erin@cover-me.test');
update public.users set stripe_customer_id = 'cus_erin' where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

select public.set_tier_if_newer('cus_erin', 'hosted_pro', '2026-01-01 10:00:00+00');
select is((select tier from public.users where stripe_customer_id = 'cus_erin'), 'hosted_pro', 'first write lands');

-- A later read (subscription cancelled) wins over an earlier one that arrives last.
select public.set_tier_if_newer('cus_erin', 'hosted_free', '2026-01-01 10:00:05+00');
select public.set_tier_if_newer('cus_erin', 'hosted_pro', '2026-01-01 10:00:02+00');
select is((select tier from public.users where stripe_customer_id = 'cus_erin'), 'hosted_free', 'an older read cannot overwrite a newer one');

select public.set_tier_if_newer('cus_erin', 'hosted_pro', '2026-01-01 10:00:09+00');
select is((select tier from public.users where stripe_customer_id = 'cus_erin'), 'hosted_pro', 'a newer read still lands');

select ok(not has_function_privilege('anon', 'public.set_tier_if_newer(text, text, timestamptz)', 'execute'), 'anon cannot call it');
select ok(not has_function_privilege('authenticated', 'public.set_tier_if_newer(text, text, timestamptz)', 'execute'), 'signed-in users cannot call it');

select ok(has_function_privilege('service_role', 'public.set_tier_if_newer(text, text, timestamptz)', 'execute'), 'the webhook (service key) can call it');

select * from finish();
rollback;
