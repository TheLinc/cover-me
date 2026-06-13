-- Add job_url to cover_letters so the source posting is permanently linked.
--
-- Future dashboard migration path:
--   1. Create job_applications (id, user_id, title, company, url, created_at)
--   2. Backfill: INSERT INTO job_applications SELECT DISTINCT ON (user_id, company, role, job_url) ...
--   3. Add job_application_id FK to cover_letters and future tailored_resumes table
--   4. Drop company, role, job_url from cover_letters (they live on job_applications)
--
-- job_url is nullable — manual-entry letters have no URL.

alter table public.cover_letters
  add column if not exists job_url text;
