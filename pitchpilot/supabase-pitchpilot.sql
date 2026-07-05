-- ============================================================
-- PitchPilot v5 — usage & plans. Run once in the SQL Editor of PitchPilot's
-- OWN, SEPARATE Supabase project (not Fuse Studio's — public sign-ups here
-- must never touch Fuse Studio accounts). Safe to re-run.
-- ============================================================
create table if not exists public.pp_usage (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  uses_left       integer not null default 3,      -- every new user starts with 3 free pitches
  plan            text not null default 'free',    -- free | starter | pro | agency
  plan_expires_at timestamptz,
  updated_at      timestamptz not null default now()
);

alter table public.pp_usage enable row level security;
drop policy if exists "own pp usage read" on public.pp_usage;
create policy "own pp usage read" on public.pp_usage
  for select using (auth.uid() = user_id);
-- All writes happen server-side via the service role (bypasses RLS).

-- If you already ran the older v4 script (default 5) on this project,
-- this brings the table default in line — it does NOT touch existing
-- users' current uses_left, only new signups going forward.
alter table public.pp_usage alter column uses_left set default 3;
