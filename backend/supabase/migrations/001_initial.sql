-- ── Tables ───────────────────────────────────────────────────────────────────

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  stripe_customer_id text,
  tier text not null default 'hosted_free' check (tier in ('hosted_free', 'hosted_pro')),
  created_at timestamptz not null default now()
);

-- Per-user, per-day generation count (free tier rate limiting)
create table public.rate_limits (
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null default current_date,
  count integer not null default 0,
  primary key (user_id, date)
);

-- One resume per user; text encrypted at application layer before storage
create table public.resumes (
  user_id uuid primary key references public.users(id) on delete cascade,
  text_encrypted text not null,
  filename text,
  updated_at timestamptz not null default now()
);

-- Cover letter history (Phase 3: hosted_pro only; free tier stores locally)
create table public.cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  company text,
  role text,
  letter_encrypted text not null,
  created_at timestamptz not null default now()
);

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table public.users enable row level security;
alter table public.rate_limits enable row level security;
alter table public.resumes enable row level security;
alter table public.cover_letters enable row level security;

create policy "users: own row" on public.users
  for all using (auth.uid() = id);

create policy "rate_limits: own rows" on public.rate_limits
  for all using (auth.uid() = user_id);

create policy "resumes: own row" on public.resumes
  for all using (auth.uid() = user_id);

create policy "cover_letters: own rows" on public.cover_letters
  for all using (auth.uid() = user_id);

-- ── Trigger: create public.users row on sign-up ───────────────────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
