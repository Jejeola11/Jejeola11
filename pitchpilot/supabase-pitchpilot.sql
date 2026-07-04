-- ============================================================
-- PitchPilot v4 — usage & plans (run once in Supabase SQL Editor,
-- SAME project as Fuse Studio: accounts are shared between both apps).
-- Safe to re-run.
-- ============================================================
create table if not exists public.pp_usage (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  uses_left       integer not null default 5,      -- every new user starts with 5 free pitches
  plan            text not null default 'free',    -- free | starter | pro | agency
  plan_expires_at timestamptz,
  updated_at      timestamptz not null default now()
);

alter table public.pp_usage enable row level security;
drop policy if exists "own pp usage read" on public.pp_usage;
create policy "own pp usage read" on public.pp_usage
  for select using (auth.uid() = user_id);
-- All writes happen server-side via the service role (bypasses RLS).
