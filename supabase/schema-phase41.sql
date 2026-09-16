-- ============================================================
-- Fuse Atelier — Phase 41: Fuse Pages projects + version history
-- ============================================================

create table if not exists public.page_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled page',
  page_type text not null default 'landing',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  slug text,
  site_spec jsonb not null default '{}'::jsonb,
  published_spec jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.page_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.page_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version_no integer not null,
  site_spec jsonb not null,
  note text,
  created_at timestamptz not null default now(),
  unique(project_id, version_no)
);

create index if not exists page_projects_user_updated_idx
  on public.page_projects(user_id, updated_at desc);

create index if not exists page_versions_project_version_idx
  on public.page_versions(project_id, version_no desc);

alter table public.page_projects enable row level security;
alter table public.page_versions enable row level security;

drop policy if exists "Users can read own page projects" on public.page_projects;
create policy "Users can read own page projects"
  on public.page_projects for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own page versions" on public.page_versions;
create policy "Users can read own page versions"
  on public.page_versions for select
  using (auth.uid() = user_id);

create or replace function public.touch_page_project_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists page_projects_touch_updated_at on public.page_projects;
create trigger page_projects_touch_updated_at
before update on public.page_projects
for each row execute function public.touch_page_project_updated_at();
