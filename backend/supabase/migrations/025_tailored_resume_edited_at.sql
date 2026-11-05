-- When the user last edited a tailored resume in the extension's editor tab
-- (#118). Null until then. The ATS score stays from before the edit, so the
-- dashboard labels it "Scored before your edits" from this column, which the
-- card list reads without decrypting the resume.
alter table public.tailored_resumes add column edited_at timestamptz;
