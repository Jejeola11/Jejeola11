-- Fuse Atelier Phase 44
-- Allow signed-in users to upload/update/read/delete only their own
-- video reference files inside the public avatars bucket.
-- Video Create stores refs at: <auth.uid()>/video-ref-...

drop policy if exists "fuse users upload own video refs" on storage.objects;
drop policy if exists "fuse users read own video refs" on storage.objects;
drop policy if exists "fuse users update own video refs" on storage.objects;
drop policy if exists "fuse users delete own video refs" on storage.objects;

create policy "fuse users upload own video refs"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "fuse users read own video refs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "fuse users update own video refs"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "fuse users delete own video refs"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
