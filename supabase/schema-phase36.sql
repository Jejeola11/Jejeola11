-- ============================================================
-- Fuse Studio — Phase 36: Flyer Studio locked-spec rebuild.
--   design_spec holds the LAYER GRAPH a flyer is built from (see
--   netlify/functions/_flyer-spec.js): palette, fonts, and an ordered list
--   of fill / image / text layers with percentage geometry. This is the
--   source of truth the editor renders from, so a project can be reopened
--   and every element is still a separate, editable object.
--
--   This is deliberately NOT the same thing as design_state (phase 33).
--   design_state is the Fabric.js canvas dump — where things ended up after
--   the user dragged them. design_spec is the ORIGINAL art-director spec —
--   what was asked for, including each image layer's own generation prompt.
--   Keeping both means "regenerate just this layer" still knows the intent
--   behind that layer, which a canvas dump cannot tell you.
--
--   design_spec_rev bumps on every accepted spec so the client can tell a
--   stale render from a current one without diffing the whole JSON.
-- Run after schema-phase35.sql. Safe to re-run.
-- ============================================================

alter table public.flyer_projects add column if not exists design_spec jsonb;
alter table public.flyer_projects add column if not exists design_spec_rev integer not null default 0;

-- Layer images are generated one at a time and cached by layer id, so a
-- regenerate of one layer never re-runs the others. Keyed { layerId: url }.
alter table public.flyer_projects add column if not exists layer_images jsonb not null default '{}'::jsonb;
