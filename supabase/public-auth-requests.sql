-- Service-only request log used to limit verification emails. No client grants.
create table if not exists public.public_auth_requests (id bigint generated always as identity primary key,email_hash text not null,ip_hash text not null,created_at timestamptz not null default now());
alter table public.public_auth_requests enable row level security;
revoke all on public.public_auth_requests from anon,authenticated;
create index if not exists public_auth_requests_email_time on public.public_auth_requests(email_hash,created_at);
create index if not exists public_auth_requests_ip_time on public.public_auth_requests(ip_hash,created_at);
