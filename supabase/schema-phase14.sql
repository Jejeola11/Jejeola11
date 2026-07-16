-- ============================================================
-- Fuse Studio — Phase 14: AI Avatar Creator (long-form video).
--   Adds voice-clone + trained-video fields to `avatars`, plus two new
--   tables driving the fully-automated long-form pipeline:
--     avatar_videos       — one row per requested video (script + settings
--                           + overall stage), the parent job.
--     avatar_video_chunks — one row per unit of async work inside that job:
--                           kind='speech' rows are Omnivoice batches that get
--                           concatenated into the full narration track; kind=
--                           'video' rows are the frame-chained InfiniteTalk
--                           chunks that get concatenated into the final video.
--   The whole pipeline advances automatically on each poll from the browser
--   (see netlify/functions/avatar-video-status.js) — no cron, no background
--   function, no manual "next chunk" step for the user.
--
--   NOTE: avatars.id is a BIGINT (see schema-phase4.sql), not uuid — every
--   FK here matches that type. (schema-phase12.sql's jobs.avatar_id is a
--   loosely-typed uuid column with no FK at all; not repeating that here.)
-- Run after earlier files. Safe to re-run.
-- ============================================================

-- ---- avatars: voice-clone + trained-video fields --------------------------
alter table public.avatars add column if not exists source_video_url text;   -- uploaded training video (raw)
alter table public.avatars add column if not exists trained_frame_url text;  -- best still frame extracted from it — the master identity photo for chunk 1 of every long-form video
alter table public.avatars add column if not exists voice_sample_url text;   -- short reference clip (3-10s) used for voice cloning
alter table public.avatars add column if not exists voice_status text not null default 'none'; -- none | ready

-- ---- avatar_videos: one row per requested long-form video -----------------
create table if not exists public.avatar_videos (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  avatar_id        bigint not null references public.avatars(id) on delete cascade,
  script           text not null,
  settings         jsonb not null default '{}'::jsonb,   -- {resolution, aspect, speed, outfit_ref, start_image, prompt}
  stage            text not null default 'speech',       -- speech | slicing | video | stitching | complete | failed
  speech_url       text,                                  -- full concatenated narration (set once 'speech' stage finishes)
  total_duration_sec numeric,
  output_url       text,                                  -- final stitched video (set once 'stitching' finishes)
  credits          integer not null default 0,
  error_message    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---- avatar_video_chunks: the async work units inside one avatar_video ---
create table if not exists public.avatar_video_chunks (
  id               uuid primary key default gen_random_uuid(),
  avatar_video_id  uuid not null references public.avatar_videos(id) on delete cascade,
  kind             text not null,                         -- 'speech' | 'video'
  seq              integer not null,
  request_id       text,                                  -- provider job id (possibly "ws:"-prefixed) — null until submitted
  status           text not null default 'pending',        -- pending | processing | completed | failed
  input_audio_url  text,                                  -- kind='video' only: this chunk's sliced narration segment
  source_frame_url text,                                  -- kind='video' only: reference image used (master frame, or prev chunk's last frame)
  output_url       text,                                  -- kind='speech': this batch's audio. kind='video': this chunk's video.
  last_frame_url   text,                                  -- kind='video' only: extracted after completion, feeds the NEXT chunk
  start_sec        numeric,                                -- kind='video' only: offset into the full narration track
  duration_sec     numeric,
  created_at       timestamptz not null default now(),
  unique (avatar_video_id, kind, seq)
);

create index if not exists avatar_video_chunks_lookup_idx on public.avatar_video_chunks (avatar_video_id, kind, seq);
create index if not exists avatar_videos_user_idx on public.avatar_videos (user_id, created_at desc);

-- ---- RLS: read-only for the owning user, all writes are server-side ------
-- (Same pattern as `jobs`: the browser only ever needs to see progress, so a
-- SELECT policy is enough — avatar-video-create.js / avatar-video-status.js
-- use the service-role admin() client for every insert/update, which
-- bypasses RLS entirely.)
alter table public.avatar_videos enable row level security;
drop policy if exists "own avatar videos read" on public.avatar_videos;
create policy "own avatar videos read" on public.avatar_videos for select using (auth.uid() = user_id);

alter table public.avatar_video_chunks enable row level security;
drop policy if exists "own avatar video chunks read" on public.avatar_video_chunks;
create policy "own avatar video chunks read" on public.avatar_video_chunks for select using (
  exists (
    select 1 from public.avatar_videos v
    where v.id = avatar_video_chunks.avatar_video_id and v.user_id = auth.uid()
  )
);
