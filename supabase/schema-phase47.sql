-- Fuse Client: sample-first acquisition pipeline, founder enrichment and contracts.
alter table public.client_prospects
  add column if not exists founder_name text,
  add column if not exists founder_title text,
  add column if not exists founder_linkedin text,
  add column if not exists founder_email text,
  add column if not exists founder_phone text,
  add column if not exists founder_instagram text,
  add column if not exists current_activity text,
  add column if not exists current_activity_url text,
  add column if not exists funding_total_usd numeric,
  add column if not exists funding_source_url text,
  add column if not exists source_links jsonb not null default '[]'::jsonb,
  add column if not exists qualification_json jsonb not null default '{}'::jsonb,
  add column if not exists ad_signal_json jsonb not null default '{}'::jsonb,
  add column if not exists sample_type text,
  add column if not exists sample_status text,
  add column if not exists sample_submission_copy text,
  add column if not exists sample_created_at timestamptz,
  add column if not exists sample_sent_at timestamptz,
  add column if not exists client_agreed_at timestamptz,
  add column if not exists proposal_sent_at timestamptz,
  add column if not exists deal_locked_at timestamptz,
  add column if not exists contract_sent_at timestamptz,
  add column if not exists contract_signed_at timestamptz;

create table if not exists public.client_contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prospect_id uuid not null references public.client_prospects(id) on delete cascade,
  proposal_id uuid references public.client_proposals(id) on delete set null,
  title text not null default 'Service Agreement',
  body text not null,
  status text not null default 'draft',
  public_token text not null unique default encode(gen_random_bytes(18),'hex'),
  signer_name text,
  signer_email text,
  signature_text text,
  signer_ip text,
  signer_user_agent text,
  sent_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_contracts enable row level security;
drop policy if exists client_contracts_select_own on public.client_contracts;
drop policy if exists client_contracts_insert_own on public.client_contracts;
drop policy if exists client_contracts_update_own on public.client_contracts;
drop policy if exists client_contracts_delete_own on public.client_contracts;
create policy client_contracts_select_own on public.client_contracts for select to authenticated using (auth.uid() = user_id);
create policy client_contracts_insert_own on public.client_contracts for insert to authenticated with check (auth.uid() = user_id);
create policy client_contracts_update_own on public.client_contracts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy client_contracts_delete_own on public.client_contracts for delete to authenticated using (auth.uid() = user_id);

create index if not exists client_contracts_user_prospect_idx on public.client_contracts(user_id,prospect_id,created_at desc);
create index if not exists client_contracts_token_idx on public.client_contracts(public_token);

alter table public.client_prospects drop constraint if exists client_prospects_status_check;
alter table public.client_prospects
  add constraint client_prospects_status_check
  check (status = any (array[
    'new'::text,'qualified'::text,'audited'::text,'contacted'::text,'asked'::text,'replied'::text,
    'sample_ready'::text,'sample_sent'::text,'agreed'::text,'proposal_ready'::text,'proposal_sent'::text,
    'deal_locked'::text,'contract_sent'::text,'contract_signed'::text,'won'::text,'lost'::text,
    'research_ready'::text,'brief_ready'::text,'deposit_paid'::text,'in_delivery'::text,'delivered'::text,
    'pitched'::text,'follow_up'::text
  ]));
