-- ============================================================
-- Fuse Studio — Phase 23: let an avatar's long-form narration use Resemble
--   instead of WaveSpeed's Omnivoice — same two-engine choice Audio Studio
--   already got in schema-phase22.sql's companion code change.
-- Run after schema-phase22.sql. Safe to re-run.
-- ============================================================
alter table public.avatars add column if not exists tts_engine text not null default 'wavespeed';
alter table public.avatars add column if not exists resemble_voice_uuid text;
