-- First Client Playbook lead-gate fields (already applied to the hosted project)
alter table public.phone_to_client_leads
  add column if not exists email_normalized text,
  add column if not exists phone_e164 text,
  add column if not exists lead_type text not null default 'playbook',
  add column if not exists browser_token text,
  add column if not exists phone_verified boolean not null default false,
  add column if not exists verified_at timestamptz;

update public.phone_to_client_leads
set email_normalized = lower(trim(email))
where email_normalized is null and email is not null;

create unique index if not exists phone_to_client_leads_playbook_email_unique
  on public.phone_to_client_leads (email_normalized)
  where lead_type = 'playbook' and email_normalized is not null;

create unique index if not exists phone_to_client_leads_browser_token_unique
  on public.phone_to_client_leads (browser_token)
  where browser_token is not null;