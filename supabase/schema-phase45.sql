-- Fuse Client OS V1
-- Prospect intelligence -> outreach -> Loom -> proposal -> retainer -> recurring jobs.

alter table public.client_prospects
  add column if not exists google_place_id text,
  add column if not exists maps_url text,
  add column if not exists rating numeric,
  add column if not exists review_count integer,
  add column if not exists business_status text,
  add column if not exists opportunity_score integer default 0,
  add column if not exists audit_json jsonb not null default '{}'::jsonb,
  add column if not exists audit_summary text,
  add column if not exists offer_angle text,
  add column if not exists loom_url text,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists last_activity_at timestamptz;

create table if not exists public.client_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid not null references public.client_prospects(id) on delete cascade,
  title text not null default 'Growth proposal',
  summary text,
  scope jsonb not null default '[]'::jsonb,
  monthly_price numeric,
  setup_fee numeric,
  currency text not null default 'USD',
  status text not null default 'draft',
  proposal_copy text,
  public_token text unique default encode(gen_random_bytes(18),'hex'),
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_loom_scripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid not null references public.client_prospects(id) on delete cascade,
  hook text,
  sections jsonb not null default '[]'::jsonb,
  cta text,
  duration_seconds integer not null default 75,
  loom_url text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid references public.client_prospects(id) on delete cascade,
  activity_type text not null,
  title text not null,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.client_retainers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid not null references public.client_prospects(id) on delete cascade,
  client_name text not null,
  service text,
  monthly_fee numeric not null default 0,
  currency text not null default 'USD',
  billing_day integer not null default 1,
  status text not null default 'active',
  payment_method text,
  payment_reference text,
  started_at timestamptz not null default now(),
  next_bill_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, prospect_id)
);

create table if not exists public.client_automation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  retainer_id uuid references public.client_retainers(id) on delete cascade,
  prospect_id uuid references public.client_prospects(id) on delete cascade,
  job_type text not null,
  name text not null,
  frequency text not null default 'monthly',
  status text not null default 'active',
  config jsonb not null default '{}'::jsonb,
  last_run_at timestamptz,
  next_run_at timestamptz,
  last_result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_prospects_user_stage_idx on public.client_prospects(user_id,status,updated_at desc);
create index if not exists client_prospects_google_place_idx on public.client_prospects(user_id,google_place_id);
create index if not exists client_activities_user_created_idx on public.client_activities(user_id,created_at desc);
create index if not exists client_proposals_user_prospect_idx on public.client_proposals(user_id,prospect_id,created_at desc);
create index if not exists client_retainers_user_status_idx on public.client_retainers(user_id,status);
create index if not exists client_automation_due_idx on public.client_automation_jobs(user_id,status,next_run_at);

alter table public.client_proposals enable row level security;
alter table public.client_loom_scripts enable row level security;
alter table public.client_activities enable row level security;
alter table public.client_retainers enable row level security;
alter table public.client_automation_jobs enable row level security;

do $$
declare t text;
begin
  foreach t in array array['client_proposals','client_loom_scripts','client_activities','client_retainers','client_automation_jobs'] loop
    execute format('drop policy if exists %I on public.%I', t||'_select_own', t);
    execute format('drop policy if exists %I on public.%I', t||'_insert_own', t);
    execute format('drop policy if exists %I on public.%I', t||'_update_own', t);
    execute format('drop policy if exists %I on public.%I', t||'_delete_own', t);
    execute format('create policy %I on public.%I for select to authenticated using (auth.uid() = user_id)', t||'_select_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (auth.uid() = user_id)', t||'_insert_own', t);
    execute format('create policy %I on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t||'_update_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using (auth.uid() = user_id)', t||'_delete_own', t);
  end loop;
end $$;

drop policy if exists client_research_requests_insert_own on public.client_research_requests;
create policy client_research_requests_insert_own on public.client_research_requests for insert to authenticated with check (auth.uid() = user_id);
