-- Fuse Client Agent: reusable owner memory, paid discovery jobs and a global prospect registry.
create table if not exists public.client_agent_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  memory_summary text not null default '',
  profile_json jsonb not null default '{}'::jsonb,
  portfolio_urls jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.client_agent_profiles enable row level security;
drop policy if exists client_agent_profiles_select_own on public.client_agent_profiles;
drop policy if exists client_agent_profiles_insert_own on public.client_agent_profiles;
drop policy if exists client_agent_profiles_update_own on public.client_agent_profiles;
create policy client_agent_profiles_select_own on public.client_agent_profiles for select to authenticated using (auth.uid() = user_id);
create policy client_agent_profiles_insert_own on public.client_agent_profiles for insert to authenticated with check (auth.uid() = user_id);
create policy client_agent_profiles_update_own on public.client_agent_profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.client_prospect_registry (
  id uuid primary key default gen_random_uuid(),
  canonical_key text not null unique,
  google_place_id text unique,
  domain text,
  brand_name text not null,
  location text,
  assigned_user_id uuid not null references auth.users(id) on delete restrict,
  reservation_expires_at timestamptz not null default (now() + interval '120 days'),
  contacted_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists client_prospect_registry_reservation_idx on public.client_prospect_registry(reservation_expires_at);
alter table public.client_prospect_registry enable row level security;
drop policy if exists client_prospect_registry_no_direct_access on public.client_prospect_registry;
create policy client_prospect_registry_no_direct_access on public.client_prospect_registry for select to authenticated using (false);

alter table public.client_research_requests
  add column if not exists requested_count integer not null default 5,
  add column if not exists credits_charged integer not null default 0,
  add column if not exists credits_refunded integer not null default 0,
  add column if not exists offer_json jsonb not null default '{}'::jsonb,
  add column if not exists profile_snapshot jsonb not null default '{}'::jsonb;

alter table public.client_prospects
  add column if not exists registry_id uuid references public.client_prospect_registry(id) on delete set null,
  add column if not exists research_date timestamptz,
  add column if not exists contact_method text;
create index if not exists client_prospects_registry_idx on public.client_prospects(registry_id);
