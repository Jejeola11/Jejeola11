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

-- ============================================================
-- Lead Finder — v6. A found business (Google Maps, or anywhere else) that
-- a freelancer is tracking through outreach. One row per lead, owned by
-- the freelancer who found it.
-- ============================================================
create table if not exists public.pp_leads (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  business_name   text not null,
  phone           text,
  phone_type      text,               -- mobile | landline | unknown
  email           text,
  website         text,
  address         text,
  category        text,               -- e.g. "roofer", "skincare spa"
  rating          numeric,
  reviews_count   integer,
  gap_summary     text,               -- e.g. "No website · Only 8 reviews · Not responding to reviews"
  has_website     boolean,
  source          text not null default 'google_maps',  -- google_maps | manual
  status          text not null default 'new',           -- new | contacted | replied | sample_sent | won | lost
  notes           text,
  sample_brief    text,               -- "what to create for them" guide from the AI
  last_contacted_at timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists pp_leads_user_idx on public.pp_leads(user_id, status);

alter table public.pp_leads enable row level security;
drop policy if exists "own leads read" on public.pp_leads;
create policy "own leads read" on public.pp_leads
  for select using (auth.uid() = user_id);
-- Writes happen server-side via the service role (bypasses RLS), same
-- pattern as pp_usage, so a lead search/update always goes through the
-- Netlify functions (which check the user's plan/usage first).
