-- ============================================================
-- Fuse Studio — Phase 25: stop leaking paid lesson video URLs.
-- course_videos has had `for select using (true)` since phase 11 --
-- meant so the course LIST could show which lessons have a video and how
-- long they run, without needing a login. In practice this also exposed
-- the real playable `url` column to anyone with the public anon key,
-- completely bypassing atelierTier()/moduleUnlocked() -- the app's UI
-- never showed a locked lesson's URL, but the raw table was never
-- actually gated, so that was UI-level hiding, not real access control.
--
-- Fix: keep the row-level policy (still needed for lesson_key/duration_sec/
-- has_video), but revoke column-level SELECT on `url` from anon and
-- authenticated entirely. The only path left to read a real url is the new
-- service-role-only lesson-video.js function, which re-derives the same
-- tier/module check app.js already does client-side (see
-- netlify/functions/_lesson-access.js, generated from app/course.js) before
-- ever returning one.
-- ============================================================

-- has_video: lets the course list keep showing "soon" vs a real duration
-- without ever needing to read the url column itself.
alter table public.course_videos add column if not exists has_video boolean generated always as (url is not null) stored;

revoke select (url) on public.course_videos from anon, authenticated;
grant select (lesson_key, duration_sec, has_video, updated_at) on public.course_videos to anon, authenticated;
