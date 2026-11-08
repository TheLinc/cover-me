-- The user's own Word file for "Your design" (#131), Pro only. One row per
-- file a tailored resume was made from, keyed by the SHA-256 of its bytes, so
-- an older tailored resume still downloads in its own file's design. The
-- resume Edge Function writes it and prunes files no tailored resume uses;
-- the applications function reads it for the dashboard. Both use the service
-- role: clients get no access at all.
create table public.resume_files (
  user_id              uuid        not null references public.users(id) on delete cascade,
  hash                 text        not null check (hash ~ '^[0-9a-f]{64}$'),
  docx_encrypted       text        not null,
  -- The resume's parse when the file was uploaded: it places the tailored
  -- text in the file (lib/pdf/docx-design.ts).
  structured_encrypted text,
  created_at           timestamptz not null default now(),
  primary key (user_id, hash)
);

alter table public.resume_files enable row level security;
revoke all on public.resume_files from anon, authenticated;

-- Which file a tailored resume was made from, so files no tailored resume
-- uses can be pruned. A hash of the user's own file, not its content.
alter table public.tailored_resumes add column source_hash text check (source_hash ~ '^[0-9a-f]{64}$');
