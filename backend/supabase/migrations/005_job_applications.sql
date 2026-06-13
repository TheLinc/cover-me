-- Establish job_applications as the first-class entity that cover letters and
-- tailored resumes both belong to. Backfills from existing cover_letters rows,
-- then drops the now-redundant denormalized columns.
--
-- Dashboard query after this migration:
--   SELECT ja.*, cl.id cl_id, tr.id tr_id
--   FROM job_applications ja
--   LEFT JOIN cover_letters cl ON cl.job_application_id = ja.id
--   LEFT JOIN tailored_resumes tr ON tr.job_application_id = ja.id
--   WHERE ja.user_id = $1
--   ORDER BY ja.created_at DESC

-- ── New tables ────────────────────────────────────────────────────────────────

CREATE TABLE public.job_applications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title      TEXT,
  company    TEXT,
  url        TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.tailored_resumes (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_application_id    UUID        REFERENCES public.job_applications(id) ON DELETE SET NULL,
  resume_json_encrypted TEXT        NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tailored_resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_applications: own rows" ON public.job_applications
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "tailored_resumes: own rows" ON public.tailored_resumes
  FOR ALL USING (auth.uid() = user_id);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Dashboard list: user's jobs ordered by recency
CREATE INDEX ON public.job_applications(user_id, created_at DESC);

-- Partial unique index: one job_application per (user_id, url) when url exists.
-- Used by find-or-create to prevent duplicates without a full unique constraint
-- that would reject NULL-url rows (manual entries).
CREATE UNIQUE INDEX job_applications_user_url
  ON public.job_applications(user_id, url)
  WHERE url IS NOT NULL;

-- tailored_resumes indexes (cover_letters index added after the FK column below)
CREATE INDEX ON public.tailored_resumes(job_application_id);
CREATE INDEX ON public.tailored_resumes(user_id, created_at DESC);

-- ── Backfill job_applications from existing cover_letters ─────────────────────

-- One row per distinct job per user. DISTINCT ON picks the earliest letter as
-- the canonical record; subsequent letters for the same job will FK to it.
INSERT INTO public.job_applications (user_id, title, company, url, created_at)
SELECT DISTINCT ON (user_id, COALESCE(job_url, COALESCE(company, '') || '|||' || COALESCE(role, '')))
  user_id,
  role    AS title,
  company,
  job_url AS url,
  created_at
FROM public.cover_letters
ORDER BY
  user_id,
  COALESCE(job_url, COALESCE(company, '') || '|||' || COALESCE(role, '')),
  created_at ASC;

-- ── Add FK column to cover_letters ────────────────────────────────────────────

ALTER TABLE public.cover_letters
  ADD COLUMN job_application_id UUID REFERENCES public.job_applications(id) ON DELETE SET NULL;

CREATE INDEX ON public.cover_letters(job_application_id);

-- ── Wire existing cover letters to their job_application ──────────────────────

UPDATE public.cover_letters cl
SET job_application_id = ja.id
FROM public.job_applications ja
WHERE cl.user_id = ja.user_id
  AND (
    -- URL match (most reliable)
    (cl.job_url IS NOT NULL AND cl.job_url = ja.url)
    OR
    -- company + role match for manual (URL-less) entries
    (cl.job_url IS NULL
     AND ja.url IS NULL
     AND COALESCE(cl.company, '') = COALESCE(ja.company, '')
     AND COALESCE(cl.role,    '') = COALESCE(ja.title,   ''))
  );

-- ── Drop redundant columns from cover_letters ─────────────────────────────────
-- These fields now live on job_applications; all queries use the FK join.

ALTER TABLE public.cover_letters
  DROP COLUMN IF EXISTS company,
  DROP COLUMN IF EXISTS role,
  DROP COLUMN IF EXISTS job_url;
