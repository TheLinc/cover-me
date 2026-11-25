-- Drop the old "got an interview" mark (018, #103). 020 copied every mark into
-- stage and kept the column for one release; nothing reads or writes it now.
-- Covered by supabase/tests/database/application_stage.test.sql.
ALTER TABLE public.job_applications DROP COLUMN interview_at;
