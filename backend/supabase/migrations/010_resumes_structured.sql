-- Cached structured resume (AI-parsed JSON, encrypted) used by the tailor
-- delta prompt. Parsed once by the tailor Edge Function on first use and
-- cleared by the resume Edge Function whenever the resume text is replaced.
alter table resumes add column if not exists structured_encrypted text;
