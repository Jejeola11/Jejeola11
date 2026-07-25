-- ============================================================
-- Fuse Studio — Phase 32: Avatar Stills Library.
-- Until now an avatar had exactly ONE reference photo it could animate from
-- (avatars.trained_frame_url, extracted once from a training video, or
-- model_sheet_url/image_url as fallbacks). Every long-form video's chunk 0
-- always started from that same single photo. This table lets a user save
-- MULTIPLE avatar stills per avatar -- generated in Model Sheet, or
-- uploaded directly -- and pick any of them as the start frame for a
-- future video, or as the target `last_image` for a motion-mode chunk
-- (see 'avatar-motion-seedance-2' in _providers.js) to steer a scene
-- toward a specific pose/outfit/setting instead of always chaining
-- forward from wherever the previous chunk happened to end.
-- ============================================================
create table if not exists public.avatar_stills (
  id           uuid primary key default gen_random_uuid(),
  avatar_id    bigint not null references public.avatars(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  image_url    text not null,
  source       text not null default 'uploaded',  -- 'uploaded' | 'generated'
  label        text,
  created_at   timestamptz not null default now()
);

alter table public.avatar_stills enable row level security;

drop policy if exists "select own avatar stills" on public.avatar_stills;
create policy "select own avatar stills" on public.avatar_stills
  for select using (auth.uid() = user_id);

create index if not exists avatar_stills_avatar_id_idx on public.avatar_stills(avatar_id);

-- ------------------------------------------------------------
-- Bug fix: avatar-video-resync.js and job-status.js have both been reading
-- and writing avatar_videos.resync_credits / avatar_videos.resynced_url
-- since the resync feature was built, but no migration ever actually added
-- either column -- every write to them was a silent no-op (both call sites
-- swallow the update error), and app.js's loadResyncBox() reads
-- resynced_url back out, so the resync box has been unable to ever show a
-- finished resync. Adding them now makes the whole feature actually work
-- end-to-end for the first time.
-- ------------------------------------------------------------
alter table public.avatar_videos add column if not exists resync_credits integer;
alter table public.avatar_videos add column if not exists resynced_url text;
