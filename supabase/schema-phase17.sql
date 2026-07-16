-- ============================================================
-- Fuse Studio — Phase 17: Flyer Studio rework — up-front reference images.
--   The founder wants to attach up to 20 reference images (the product to
--   design for, inspirational flyers, etc.) at the START of a project, not
--   just describe them in text — these become real image-conditioning
--   input to GPT Image 2 (confirmed live to accept up to 20 images in one
--   call), not just something Claude reasons about in the abstract.
-- Run after earlier files. Safe to re-run.
-- ============================================================
alter table public.flyer_projects add column if not exists reference_image_urls jsonb not null default '[]'::jsonb;
