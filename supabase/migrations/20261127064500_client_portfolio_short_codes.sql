alter table public.client_portfolio_shares add column if not exists short_code text generated always as (left(replace(token::text, '-', ''), 12)) stored;
create unique index if not exists client_portfolio_shares_short_code_idx on public.client_portfolio_shares (short_code);
