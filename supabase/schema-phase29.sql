-- ============================================================
-- Fuse Studio — Phase 29: promo codes (limited-slot discount codes).
-- First use: "$500 Dollar Week" students getting a ₦5,000-off, 30-slot
-- insider code into Fuse Atelier (see insider.html + validate-promo.js).
-- Built generic so any future limited-slot promo just needs a new row here,
-- no code changes.
--
-- Redemption timing: a code is NOT consumed just because someone opened
-- Paystack with it (see paystack-init-guest.js -- checkout-init only does a
-- read-only availability check). It's only atomically redeemed in
-- paystack-webhook.js once a real payment actually confirms, so an
-- abandoned checkout never burns one of the 30 slots.
-- ============================================================
create table if not exists public.promo_codes (
  code             text primary key,
  discount_naira   integer not null check (discount_naira >= 0),
  max_redemptions  integer not null check (max_redemptions > 0),
  redeemed_count   integer not null default 0,
  active           boolean not null default true,
  label            text,
  created_at       timestamptz not null default now()
);

alter table public.promo_codes enable row level security;
-- No client-facing policies -- every read/write goes through service-role
-- functions (validate-promo.js, paystack-webhook.js), same pattern as
-- `avatars` (see schema-phase4.sql).

-- Atomic redeem: a single UPDATE with the cap enforced in the WHERE clause,
-- so concurrent webhook calls can never push redeemed_count past
-- max_redemptions no matter how they interleave -- no separate lock needed.
-- Returns the updated row on success, no rows at all on failure
-- (unknown code / inactive / already fully redeemed).
create or replace function public.redeem_promo_code(p_code text)
returns setof public.promo_codes
language sql
security definer
set search_path = public
as $$
  update public.promo_codes
  set redeemed_count = redeemed_count + 1
  where code = p_code and active and redeemed_count < max_redemptions
  returning *;
$$;

-- SECURITY DEFINER functions are PUBLIC-callable by default -- explicitly
-- lock this down to service_role only. It has no payment-status check of
-- its own (that's the webhook's job); anyone able to call it directly could
-- burn all 30 slots for free without ever paying.
revoke all on function public.redeem_promo_code(text) from public;
revoke all on function public.redeem_promo_code(text) from anon, authenticated;
grant execute on function public.redeem_promo_code(text) to service_role;

-- Records which promo code (if any) a payment used, for reporting.
alter table public.payments add column if not exists promo_code text;

insert into public.promo_codes (code, discount_naira, max_redemptions, label)
values ('WEEK500', 5000, 30, '$500 Dollar Week -> Fuse Atelier cross-sell, launch batch')
on conflict (code) do nothing;
