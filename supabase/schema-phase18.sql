-- ============================================================
-- Fuse Studio — Phase 18: Video Editing Studio.
--   Upload a finished video (from the Avatar Creator, general Video Studio,
--   or anywhere) + editing instructions -> transcribe -> Claude proposes an
--   edit plan (caption style, CTA text, on-screen highlight moments) ->
--   captions are burned in via ffmpeg's libass renderer (word-level
--   timestamps from Whisper, karaoke-style highlighting) -> optional
--   uploaded elements (proof screenshots, logos, stickers) composited at
--   chosen timestamps -> final export, ad/IG/TikTok-ready.
-- Run after earlier files. Safe to re-run.
-- ============================================================
create table if not exists public.video_edit_projects (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  source_video_url  text not null,
  brief             text,                                    -- the user's editing instructions
  transcript        jsonb,                                    -- {text, words:[{word,start,end}], segments:[...]}
  edit_plan         jsonb,                                    -- {reply, caption_style, cta_text, broll_suggestions, notes}
  caption_style     jsonb not null default '{}'::jsonb,        -- {font_role, accent_color, position, highlight_color}
  elements          jsonb not null default '[]'::jsonb,        -- [{image_url, start_sec, duration_sec, x, y, scale}]
  captioned_video_url text,                                    -- after captions burned in
  final_video_url   text,                                      -- after elements + CTA applied (the deliverable)
  credits           integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists video_edit_projects_user_idx on public.video_edit_projects (user_id, created_at desc);

alter table public.video_edit_projects enable row level security;
drop policy if exists "own video edit projects read" on public.video_edit_projects;
create policy "own video edit projects read" on public.video_edit_projects for select using (auth.uid() = user_id);
