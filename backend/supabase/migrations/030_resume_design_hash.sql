-- Which Word file goes with the account's current resume (#174), so another
-- computer can restore the user's own design on sign-in. Set by a Pro upload
-- of the file, cleared when new resume text arrives (the resume function).
-- Points into resume_files, but isn't a foreign key: the file may be pruned
-- or the account downgraded, and both leave nothing to restore.
alter table public.resumes add column design_hash text check (design_hash ~ '^[0-9a-f]{64}$');
