-- ============================================================
-- Fuse Studio — Phase 24: real (not guessed) lesson durations.
-- The course lesson list showed hand-typed "X min" estimates written
-- before any video existed. Once a real video is set, the actual
-- length is captured live off the player (see openLesson() in app.js)
-- and stored here, overriding the estimate.
-- ============================================================
alter table public.course_videos add column if not exists duration_sec integer;
