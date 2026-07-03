-- ============================================================
-- Fuse Studio — Supabase schema
-- Run this once in Supabase → SQL Editor → New query → Run.
-- Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE).
-- ============================================================

-- ---- Free trial size (credits given on signup) ----
-- Change this number anytime to tune the trial.
-- (Used by the new-user trigger below.)

-- =========================
-- profiles: one row per user
-- =========================
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text,
  credits         integer not null default 100,        -- trial credits on signup
  plan            text    not null default 'free',      -- 'free' | 'lite' | 'pro'
  plan_expires_at timestamptz,                          -- for monthly subscriptions
  created_at      timestamptz not null default now()
);

-- =========================
-- transactions: credit ledger (every +/- to credits)
-- =========================
create table if not exists public.transactions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  delta      integer not null,            -- +credits added / -credits spent
  reason     text not null,               -- 'trial' | 'generation' | 'purchase' | 'refund'
  meta       jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =========================
-- generations: every image/video created
-- =========================
create table if not exists public.generations (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          text not null default 'image',  -- 'image' | 'video'
  model         text,
  prompt        text,
  aspect        text,
  output_url    text,
  cost_usd      numeric,                          -- what MuAPI charged us (our cost)
  credits_spent integer,
  created_at    timestamptz not null default now()
);

-- =========================
-- payments: Paystack records (idempotent by reference)
-- =========================
create table if not exists public.payments (
  id            bigint generated always as identity primary key,
  user_id       uuid references auth.users(id) on delete set null,
  reference     text unique not null,
  amount_naira  integer,
  pack          text,
  credits_added integer,
  status        text,
  raw           jsonb,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- New-user trigger: auto-create a profile with trial credits
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, credits)
  values (new.id, new.email, 100)
  on conflict (id) do nothing;

  insert into public.transactions (user_id, delta, reason)
  values (new.id, 100, 'trial');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- spend_credits(uid, amount): atomically deduct if enough.
-- Returns the new balance, or NULL if insufficient funds.
-- Called by the generate function BEFORE generating.
-- ============================================================
create or replace function public.spend_credits(uid uuid, amount integer)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  new_balance integer;
begin
  update public.profiles
     set credits = credits - amount
   where id = uid and credits >= amount
   returning credits into new_balance;

  if new_balance is null then
    return null;  -- not enough credits
  end if;

  insert into public.transactions (user_id, delta, reason)
  values (uid, -amount, 'generation');

  return new_balance;
end;
$$;

-- ============================================================
-- add_credits(uid, amount, why): grant credits (purchase / refund).
-- Returns the new balance.
-- ============================================================
create or replace function public.add_credits(uid uuid, amount integer, why text)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  new_balance integer;
begin
  update public.profiles
     set credits = credits + amount
   where id = uid
   returning credits into new_balance;

  insert into public.transactions (user_id, delta, reason)
  values (uid, amount, coalesce(why, 'purchase'));

  return new_balance;
end;
$$;

-- ============================================================
-- Row Level Security: users can read ONLY their own rows.
-- All writes happen server-side via the service role (bypasses RLS).
-- ============================================================
alter table public.profiles     enable row level security;
alter table public.generations  enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "own generations read" on public.generations;
create policy "own generations read" on public.generations
  for select using (auth.uid() = user_id);

drop policy if exists "own transactions read" on public.transactions;
create policy "own transactions read" on public.transactions
  for select using (auth.uid() = user_id);
