-- reader_version: the extension's READER_VERSION that produced the text, so
-- another computer knows the text is current and asks for no upload (#401).
-- uploaded_at: set by an upload only; updated_at also moves on every sign-in sync.
alter table public.resumes
  add column reader_version int check (reader_version between 1 and 999),
  add column uploaded_at timestamptz;
