-- ============================================================
-- Fuse Studio — Phase 4: AI Avatar Studio (consistent faces)
-- Upload a selfie -> we lock the identity -> generate you in any scene.
-- Run AFTER the earlier schema files. Safe to re-run.
-- ============================================================

-- ---- Saved avatars (one per uploaded face) ----
create table if not exists public.avatars (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  image_url  text not null,           -- public URL of the reference selfie
  status     text not null default 'ready',  -- ready | training | failed
  created_at timestamptz not null default now()
);

alter table public.avatars enable row level security;

drop policy if exists "own avatars read" on public.avatars;
create policy "own avatars read" on public.avatars for select using (auth.uid() = user_id);

drop policy if exists "own avatars insert" on public.avatars;
create policy "own avatars insert" on public.avatars for insert with check (auth.uid() = user_id);

drop policy if exists "own avatars delete" on public.avatars;
create policy "own avatars delete" on public.avatars for delete using (auth.uid() = user_id);

-- ---- Storage bucket for the uploaded selfies (public so the engine can read) ----
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatar files read" on storage.objects;
create policy "avatar files read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatar files upload" on storage.objects;
create policy "avatar files upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars');

drop policy if exists "avatar files delete" on storage.objects;
create policy "avatar files delete" on storage.objects
  for delete to authenticated using (bucket_id = 'avatars');
