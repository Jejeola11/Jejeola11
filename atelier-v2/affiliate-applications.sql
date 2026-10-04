-- Fuse Earn application storage (applied to Supabase on 2026-10-02)
create table if not exists public.affiliate_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  instagram_handle text,
  platform_url text,
  country text not null,
  program_track text not null check (program_track in ('affiliate','creator','both')),
  audience_note text,
  agreed_to_terms boolean not null default false check (agreed_to_terms = true),
  status text not null default 'pending' check (status in ('pending','approved','paused','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.affiliate_applications enable row level security;
grant select, insert, update on public.affiliate_applications to authenticated;
create policy "Applicants can view their application" on public.affiliate_applications for select to authenticated using ((select auth.uid()) = user_id);
create policy "Applicants can submit their application" on public.affiliate_applications for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Applicants can update their application" on public.affiliate_applications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);