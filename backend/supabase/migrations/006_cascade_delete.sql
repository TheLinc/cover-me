-- Change cover_letters and tailored_resumes FKs from ON DELETE SET NULL
-- to ON DELETE CASCADE so deleting a job_application removes all its artifacts.

ALTER TABLE public.cover_letters
  DROP CONSTRAINT cover_letters_job_application_id_fkey,
  ADD CONSTRAINT cover_letters_job_application_id_fkey
    FOREIGN KEY (job_application_id) REFERENCES public.job_applications(id) ON DELETE CASCADE;

ALTER TABLE public.tailored_resumes
  DROP CONSTRAINT tailored_resumes_job_application_id_fkey,
  ADD CONSTRAINT tailored_resumes_job_application_id_fkey
    FOREIGN KEY (job_application_id) REFERENCES public.job_applications(id) ON DELETE CASCADE;
