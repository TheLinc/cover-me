-- Dashboard search (applications function): one column to filter on, so a
-- search is a set of single-column ILIKE filters instead of an .or() string
-- built from user input. The (user_id, created_at DESC) index from 005 narrows
-- to one user's rows first; one person has at most a few thousand.
ALTER TABLE public.job_applications
  ADD COLUMN search_text text
  GENERATED ALWAYS AS (coalesce(company, '') || ' ' || coalesce(title, '')) STORED;
