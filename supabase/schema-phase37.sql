-- ============================================================
-- Fuse Studio — Phase 37: AI Video & UGC Studio.
--   One row per reference video the user wants to rebuild.
--   frames        : [{ t, url }] sampled evenly across the reference
--   plan          : the validated shot plan (see _uvid-spec.js)
--   modifications : { product, avatar, notes } the user's own direction,
--                   kept separate from the plan so re-applying them after a
--                   re-analysis does not require re-typing them.
-- Run after schema-phase36.sql. Safe to re-run.
-- ============================================================
create table if not exists public.uvid_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_url text,
  duration_sec numeric,
  aspect text,
  frames jsonb not null default '[]'::jsonb,
  plan jsonb,
  modifications jsonb not null default '{}'::jsonb,
  frame_images jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.uvid_projects enable row level security;
do $$ begin
  create policy "own uvid projects" on public.uvid_projects
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
create index if not exists uvid_projects_user_idx on public.uvid_projects(user_id, created_at desc);
