-- ============================================================
-- Fuse Studio — Phase 11: Fuse Atelier course (in-app, Whop-style)
--   course_videos   : the video URL per lesson (admin sets it, everyone reads)
--   module_unlocks  : which modules a user unlocked with credits
--   course_progress : lessons a user marked complete
-- Run after earlier files. Safe to re-run.
-- ============================================================

-- Video URL per lesson. Admin writes via the course-set-video function (service role).
create table if not exists public.course_videos (
  lesson_key text primary key,
  url        text,
  updated_at timestamptz not null default now()
);
alter table public.course_videos enable row level security;
drop policy if exists "course videos public read" on public.course_videos;
create policy "course videos public read" on public.course_videos for select using (true);

-- Modules a user unlocked with credits. Written by the unlock-module function.
create table if not exists public.module_unlocks (
  user_id    uuid not null references auth.users(id) on delete cascade,
  module_key text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, module_key)
);
alter table public.module_unlocks enable row level security;
drop policy if exists "own module unlocks" on public.module_unlocks;
create policy "own module unlocks" on public.module_unlocks for select using (auth.uid() = user_id);

-- Lessons a user completed (client writes its own rows directly).
create table if not exists public.course_progress (
  user_id     uuid not null references auth.users(id) on delete cascade,
  lesson_key  text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_key)
);
alter table public.course_progress enable row level security;
drop policy if exists "own progress read" on public.course_progress;
create policy "own progress read" on public.course_progress for select using (auth.uid() = user_id);
drop policy if exists "own progress write" on public.course_progress;
create policy "own progress write" on public.course_progress for insert with check (auth.uid() = user_id);
drop policy if exists "own progress delete" on public.course_progress;
create policy "own progress delete" on public.course_progress for delete using (auth.uid() = user_id);
