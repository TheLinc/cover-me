-- "Got an interview" on a dashboard card (applications PATCH): when it was
-- marked, null when not. The UI shows only yes or no; job tracking (stages,
-- dates) is out of scope.
ALTER TABLE public.job_applications ADD COLUMN interview_at timestamptz;
