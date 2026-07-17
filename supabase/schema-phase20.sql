-- ============================================================
-- Fuse Studio — Phase 20: standalone, named, reusable trained voices.
--   Audio Studio previously only offered a raw one-off upload (lost on
--   reload) or borrowing an existing AVATAR's voice sample by that
--   avatar's name — there was no way to train a voice once, name it, and
--   pick it again later independent of any specific avatar. WaveSpeed's
--   Omnivoice model has no separate "training" step of its own (every
--   generation call re-supplies the reference sample) — so "training" here
--   just means saving that sample with a name for later reuse.
-- Run after earlier files. Safe to re-run.
-- ============================================================
create table if not exists public.voices (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  sample_url  text not null,
  created_at  timestamptz not null default now()
);

create index if not exists voices_user_idx on public.voices (user_id, created_at desc);

alter table public.voices enable row level security;
drop policy if exists "own voices read" on public.voices;
create policy "own voices read" on public.voices for select using (auth.uid() = user_id);
