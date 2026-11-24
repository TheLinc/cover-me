-- Make resumes, cover_letters, job_applications and tailored_resumes
-- server-owned, the way 011 did for users and rate_limits. The Edge Functions
-- read and write them with the service key; no client queries them directly.
--
-- Also tie each letter's and tailored resume's job_application_id to an
-- application with the same owner, so a link can't cross accounts.
--
-- Covered by supabase/tests/database/document_tables.test.sql.

set lock_timeout = '5s';

revoke all on public.resumes from anon, authenticated;
revoke all on public.cover_letters from anon, authenticated;
revoke all on public.job_applications from anon, authenticated;
revoke all on public.tailored_resumes from anon, authenticated;

update public.cover_letters cl
set job_application_id = null
where job_application_id is not null
  and not exists (
    select 1 from public.job_applications ja
    where ja.id = cl.job_application_id and ja.user_id = cl.user_id
  );

update public.tailored_resumes tr
set job_application_id = null
where job_application_id is not null
  and not exists (
    select 1 from public.job_applications ja
    where ja.id = tr.job_application_id and ja.user_id = tr.user_id
  );

alter table public.job_applications
  add constraint job_applications_id_user_id_key unique (id, user_id);

alter table public.cover_letters
  drop constraint cover_letters_job_application_id_fkey,
  add constraint cover_letters_job_application_id_fkey
    foreign key (job_application_id, user_id)
    references public.job_applications (id, user_id) on delete cascade;

alter table public.tailored_resumes
  drop constraint tailored_resumes_job_application_id_fkey,
  add constraint tailored_resumes_job_application_id_fkey
    foreign key (job_application_id, user_id)
    references public.job_applications (id, user_id) on delete cascade;
