-- ============================================================
-- Fuse Atelier — Phase 42: AI assets for Fuse Pages
-- ============================================================

create table if not exists public.page_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.page_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  kind text not null check (kind in ('image','video')),
  model text,
  prompt text,
  request_id text unique,
  status text not null default 'processing' check (status in ('processing','completed','failed')),
  url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists page_assets_project_idx
  on public.page_assets(project_id, created_at desc);

alter table public.page_assets enable row level security;

drop policy if exists "Users can read own page assets" on public.page_assets;
create policy "Users can read own page assets"
  on public.page_assets for select
  using (auth.uid() = user_id);

create or replace function public.touch_page_asset_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists page_assets_touch_updated_at on public.page_assets;
create trigger page_assets_touch_updated_at
before update on public.page_assets
for each row execute function public.touch_page_asset_updated_at();
