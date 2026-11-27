create table if not exists public.client_portfolio_shares (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fingerprint text not null,
  unique (user_id, fingerprint)
);
alter table public.client_portfolio_shares enable row level security;
revoke all on public.client_portfolio_shares from anon, authenticated;
grant select, insert, update on public.client_portfolio_shares to service_role;
