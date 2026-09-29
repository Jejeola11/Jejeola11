create table if not exists public.audience_unsubscribe_tokens (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.audience_contacts(id) on delete cascade,
  channel text not null check (channel in ('email','whatsapp')),
  token text not null unique,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists audience_unsubscribe_tokens_active_idx
  on public.audience_unsubscribe_tokens(contact_id, channel)
  where used_at is null;

create unique index if not exists audience_campaign_recipients_unique_contact_idx
  on public.audience_campaign_recipients(campaign_id, contact_id);

alter table public.audience_campaigns
  add column if not exists audience_filter jsonb not null default '{}'::jsonb,
  add column if not exists sender_name text,
  add column if not exists sender_email text,
  add column if not exists campaign_kind text not null default 'marketing'
    check (campaign_kind in ('marketing','repermission','transactional'));

alter table public.audience_unsubscribe_tokens enable row level security;

create index if not exists audience_campaigns_channel_status_idx
  on public.audience_campaigns(channel, status, created_at desc);
