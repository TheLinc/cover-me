-- Add unencrypted ATS score columns to tailored_resumes for queryable analytics.
-- These contain no PII so encryption is not required.

ALTER TABLE public.tailored_resumes
  ADD COLUMN ats_score SMALLINT CHECK (ats_score BETWEEN 0 AND 100),
  ADD COLUMN ats_gaps  TEXT[];
