-- Local-only seed data. Runs after migrations on `supabase db reset`; never
-- runs against hosted projects (db push skips it unless --include-seed).
--
-- Two confirmed accounts for signing in from the extension or web dashboard:
--   free@cover-me.test / password123   (hosted_free, 5/day limit)
--   pro@cover-me.test  / password123   (hosted_pro, unlimited)
--
-- No resumes: they're AES-GCM encrypted with ENCRYPTION_KEY inside the Edge
-- Functions, so upload one through the extension after signing in.

do $$
declare
  seed record;
begin
  for seed in
    select * from (values
      ('00000000-0000-4000-a000-000000000001'::uuid, 'free@cover-me.test'),
      ('00000000-0000-4000-a000-000000000002'::uuid, 'pro@cover-me.test')
    ) as t(id, email)
  loop
    -- Token columns must be '' rather than NULL or GoTrue fails to sign in.
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', seed.id, 'authenticated', 'authenticated', seed.email,
      extensions.crypt('password123', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(),
      '', '', '', '', '', ''
    );

    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), seed.id, seed.id::text, 'email',
      jsonb_build_object('sub', seed.id::text, 'email', seed.email, 'email_verified', true),
      now(), now(), now()
    );
  end loop;
end $$;

-- public.users rows come from the on_auth_user_created trigger.
update public.users set tier = 'hosted_pro' where email = 'pro@cover-me.test';
