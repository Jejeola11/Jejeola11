-- ============================================================
-- Fuse Studio — Phase 16: Avatar Creator motion mode + pre-made audio.
--   Two extensions to the long-form video pipeline:
--   1. `mode`: 'talking' (default — current InfiniteTalk audio-driven
--      lip-sync pipeline) or 'motion' (Seedance image-to-video, camera-
--      motion-directed, NOT lip-synced — for GRWM/walking/dressing/makeup
--      style content). Motion-mode chunks carry no audio of their own;
--      the full narration track is muxed onto the finished, concatenated
--      video once at the stitching stage instead.
--   2. `uploaded_audio_url`: lets a user skip voice cloning entirely by
--      supplying their own pre-recorded narration directly — the pipeline
--      then uses it as-is for the 'speech' stage instead of calling
--      Omnivoice, per the founder's explicit request ("option to add
--      already made audio with the script... apart from training a voice").
-- Run after earlier files. Safe to re-run.
-- ============================================================

alter table public.avatar_videos add column if not exists mode text not null default 'talking'; -- talking | motion
alter table public.avatar_videos add column if not exists camera_motion text;                     -- free-text motion direction, motion mode only
alter table public.avatar_videos add column if not exists uploaded_audio_url text;                 -- pre-made narration, skips voice cloning when set
