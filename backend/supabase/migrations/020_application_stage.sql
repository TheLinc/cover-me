-- Where an application stands (applications PATCH { stage }): Applied,
-- Interviewing, Offer or Closed (rejected, withdrawn, never heard back).
-- stage_changed_at is null until the user first changes it.
ALTER TABLE public.job_applications
  ADD COLUMN stage text NOT NULL DEFAULT 'applied'
    CHECK (stage IN ('applied', 'interviewing', 'offer', 'closed')),
  ADD COLUMN stage_changed_at timestamptz;

-- "Got an interview" marks (018) become Interviewing. interview_at stays for
-- one release so functions deployed during the rollout keep working; nothing
-- writes it after this, and a later migration drops it.
-- supabase/tests/database/application_stage.test.sql runs this statement.
UPDATE public.job_applications
  SET stage = 'interviewing', stage_changed_at = interview_at
  WHERE interview_at IS NOT NULL;
