-- ============================================================
-- Fuse Studio — Phase 14: Fuse Atelier — The Lab & The Arena.
--   The Lab: students submit their lesson deliverables for review.
--   The Arena: students submit challenge entries for review.
--   Same shape, one table, split by `kind` — Ria reviews both from
--   the same admin view.
-- Run after earlier files. Safe to re-run.
-- ============================================================
create table if not exists public.atelier_submissions (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  kind         text not null check (kind in ('lab', 'arena')),
  lesson_key   text,                     -- which lesson this deliverable is for (optional)
  content_url  text,                     -- link to the work (image/video/post)
  caption      text,                     -- what they made / what they're submitting
  created_at   timestamptz not null default now(),
  reviewed     boolean not null default false,
  review_note  text,                     -- Ria's feedback
  reviewed_at  timestamptz
);

alter table public.atelier_submissions enable row level security;

drop policy if exists "read all atelier submissions" on public.atelier_submissions;
create policy "read all atelier submissions" on public.atelier_submissions
  for select using (true);   -- The Lab/Arena are a shared feed, everyone sees everyone's work

drop policy if exists "insert own atelier submissions" on public.atelier_submissions;
create policy "insert own atelier submissions" on public.atelier_submissions
  for insert with check (auth.uid() = user_id);

-- Reviews (review_note / reviewed) are written server-side by the admin-only
-- atelier-review function (service role bypasses RLS), same pattern as the
-- rest of this app's admin actions.
