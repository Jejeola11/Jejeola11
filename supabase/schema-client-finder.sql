-- Applied to production as migration: client_finder_engine.
-- Kept in the repository so the Client Finder schema remains auditable.
alter table public.client_prospects
  add column if not exists research_request_id uuid,
  add column if not exists portfolio_url text,
  add column if not exists signals jsonb not null default '[]'::jsonb,
  add column if not exists evidence jsonb not null default '[]'::jsonb,
  add column if not exists contact_details jsonb not null default '[]'::jsonb,
  add column if not exists pitch_email text,
  add column if not exists pitch_whatsapp text,
  add column if not exists pitch_instagram text,
  add column if not exists reply_text text,
  add column if not exists replied_at timestamptz,
  add column if not exists sample_brief jsonb,
  add column if not exists proposal_copy text,
  add column if not exists research_summary text;

create table if not exists public.client_engine_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  skill text, niche text, locations text[] not null default '{}'::text[],
  market_lane text not null default 'international', offer_title text,
  offer_price numeric, offer_currency text not null default 'USD', portfolio_url text,
  updated_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table if not exists public.client_research_requests (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  requested_count integer not null check (requested_count in (2,5,10,15,20)), credit_cost integer not null check (credit_cost > 0),
  skill text not null, niche text not null, locations text[] not null default '{}'::text[], offer jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','running','completed','failed')), provider_summary jsonb not null default '{}'::jsonb,
  error_message text, created_at timestamptz not null default now(), completed_at timestamptz
);
create table if not exists public.client_review_requests (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid not null references public.client_prospects(id) on delete cascade, reply_context text not null, student_notes text,
  status text not null default 'requested' check (status in ('requested','in_review','answered','closed')), reviewer_notes text,
  created_at timestamptz not null default now(), answered_at timestamptz
);
alter table public.client_engine_profiles enable row level security;
alter table public.client_research_requests enable row level security;
alter table public.client_review_requests enable row level security;
