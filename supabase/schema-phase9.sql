-- ============================================================
-- Fuse Studio — Phase 9: async jobs (video renders longer than a function
-- can stay alive, so we submit, then poll). Run after earlier files.
-- ============================================================
create table if not exists public.jobs (
  request_id text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null default 'video',
  model      text,
  prompt     text,
  aspect     text,
  credits    integer not null default 0,
  status     text not null default 'processing',  -- processing | completed | failed
  output_url text,
  created_at timestamptz not null default now()
);
alter table public.jobs enable row level security;
drop policy if exists "own jobs read" on public.jobs;
create policy "own jobs read" on public.jobs for select using (auth.uid() = user_id);
