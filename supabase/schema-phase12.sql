-- ============================================================
-- Fuse Studio — Phase 12: Avatar "model sheet" consistency (Nano Banana method)
--   Instead of LoRA training, the user generates a multi-angle model sheet ONCE
--   from their photos, then every avatar generation uses that sheet as the
--   canonical reference — strong, cheap consistency.
-- Run after earlier files. Safe to re-run.
-- ============================================================
alter table public.avatars add column if not exists model_sheet_url text;

-- The async jobs table needs to know which avatar a model-sheet job belongs to,
-- so job-status can save the finished sheet onto that avatar.
alter table public.jobs add column if not exists avatar_id uuid;
