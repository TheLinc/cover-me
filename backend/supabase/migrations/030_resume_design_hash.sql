-- Which Word file goes with the account's current resume (#174), so another
-- computer can restore the user's own design on sign-in. Set by a Pro upload
-- of the file, cleared when new resume text arrives (the resume function).
-- Points into resume_files, but isn't a foreign key: the file may be pruned
-- or the account downgraded, and both leave nothing to restore.
alter table public.resumes add column design_hash text check (design_hash ~ '^[0-9a-f]{64}$');

-- Files uploaded before this column: the newest file kept with the resume's
-- current parse goes with its text. The upload copies the parse's ciphertext
-- as it is, and new text clears it, so a match means the same text. A file
-- whose resume parse was upgraded since isn't matched; its next upload is.
update public.resumes r set design_hash = f.hash
from (
  select distinct on (f.user_id) f.user_id, f.hash
  from public.resume_files f
  join public.resumes cur on cur.user_id = f.user_id and cur.structured_encrypted = f.structured_encrypted
  order by f.user_id, f.created_at desc
) f
where f.user_id = r.user_id;
