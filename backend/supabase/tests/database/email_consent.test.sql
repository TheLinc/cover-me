-- Email consent (migration 022): the signup choice, the server-owned columns,
-- and can_email(), the one place a sender asks whether it may write to someone.
-- Run: pnpm db:test   (from backend/)
begin;
select plan(16);

-- Ticked at signup (email signups send it as user metadata), unticked, and a
-- Google signup, which never carries the key. Confirmed unless noted.
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'ticked@cover-me.test', now(), '{"product_updates": true}'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'unticked@cover-me.test', now(), '{"product_updates": false}'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'google@cover-me.test', now(), '{"full_name": "G"}'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'unconfirmed@cover-me.test', null, '{"product_updates": true}'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'junk@cover-me.test', now(), '{"product_updates": "yes please"}');

-- ── The signup choice ────────────────────────────────────────────────────────

select results_eq(
  $$select product_updates, product_updates_source from public.users where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  $$values (true, 'signup')$$, 'a ticked signup records consent from signup');
select isnt((select product_updates_changed_at from public.users where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  null, 'a ticked signup records when consent was given');
select results_eq(
  $$select product_updates, product_updates_source, product_updates_changed_at from public.users where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$,
  $$values (false, null::text, null::timestamptz)$$, 'an unticked signup records nothing');
select is((select product_updates from public.users where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  false, 'a signup without the key starts opted out');
select is((select product_updates from public.users where id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'),
  false, 'only a real true counts as a tick, and anything else does not break signup');

-- ── can_email ────────────────────────────────────────────────────────────────

select ok(public.can_email('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'product_updates'), 'product updates go to someone who opted in');
select ok(not public.can_email('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'product_updates'), 'product updates never go to someone who did not');
select ok(public.can_email('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'onboarding'), 'onboarding mail goes to any confirmed account');
select ok(not public.can_email('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'onboarding'), 'nothing goes to an unconfirmed address, even with the box ticked');
select ok(not public.can_email('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'newsletter'), 'an unknown kind of email is refused');

-- The unsubscribe link writes both at the same moment (email-preferences).
update public.users set email_unsubscribed_at = now() - interval '1 day', product_updates = false,
  product_updates_changed_at = now() - interval '1 day', product_updates_source = 'unsubscribe'
  where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select ok(not public.can_email('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'product_updates'), 'an unsubscribe blocks product updates');
select ok(not public.can_email('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'onboarding'), 'an unsubscribe blocks onboarding mail too');

-- Turning product updates back on later is consent to those, not to the rest.
update public.users set product_updates = true, product_updates_changed_at = now(), product_updates_source = 'dashboard'
  where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select ok(public.can_email('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'product_updates'), 'opting back in after an unsubscribe allows product updates again');
select ok(not public.can_email('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'onboarding'), 'opting back in leaves other email blocked');

-- ── Server-owned: clients can neither call it nor write the columns ─────────

select ok(not has_function_privilege('authenticated', 'public.can_email(uuid, text)', 'execute'),
  'signed-in users cannot call can_email through /rest/v1/rpc');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true);
select throws_ok(
  $$update public.users set product_updates = true, product_updates_source = 'dashboard' where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$,
  '42501', null, 'a user cannot write their own consent; it goes through email-preferences');
reset role;

select * from finish();
rollback;
