-- ============================================================
-- Fuse Studio — Phase 33: Design Studio save/reopen.
--   Design Studio's "Save" previously only exported a flattened PNG into
--   flyer_projects.final_url — reopening the editor after that just
--   re-loaded that flat image as a background, so every individual text/
--   shape/sticker layer was gone (baked into pixels, no longer movable or
--   editable). design_state stores the actual Fabric.js canvas JSON
--   (every object, its position, styling — everything) so reopening
--   restores a fully editable session, not just a picture of one.
--   design_state_hero_url records which hero image that saved state was
--   built on top of, so the app can tell "the hero hasn't changed, keep
--   editing the saved design" apart from "a NEW hero was generated since
--   the last save, start fresh from that instead" without needing a
--   separate version-tracking table.
-- Run after schema-phase32.sql. Safe to re-run.
-- ============================================================

alter table public.flyer_projects add column if not exists design_state jsonb;
alter table public.flyer_projects add column if not exists design_state_hero_url text;
