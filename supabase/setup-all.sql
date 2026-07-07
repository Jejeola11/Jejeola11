-- ============================================================
-- Fuse Studio — COMPLETE database setup (all 4 files in one)
-- Paste this whole thing into Supabase → SQL Editor → Run.
-- Safe to re-run. Order matters; do not rearrange.
-- ============================================================

-- ===================== 1) CORE ============================
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
  credits         integer not null default 25,         -- trial credits on signup
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
  values (new.id, new.email, 25)
  on conflict (id) do nothing;

  insert into public.transactions (user_id, delta, reason)
  values (new.id, 25, 'trial');

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

-- ===================== 2) PHASE 2 =========================
-- ============================================================
-- Fuse Studio — Phase 2–5 additions
-- Run this AFTER schema.sql (Supabase → SQL Editor → Run).
-- Adds: referrals, challenges, content rewards, affiliate payouts.
-- Safe to re-run.
-- ============================================================

-- ---- Referrals: a code per user + who referred them ----
alter table public.profiles
  add column if not exists referral_code text unique default substr(md5(random()::text), 1, 8),
  add column if not exists referred_by uuid references auth.users(id),
  add column if not exists affiliate_naira integer not null default 0; -- cash commission earned

-- backfill codes for any existing rows
update public.profiles
   set referral_code = substr(md5(random()::text), 1, 8)
 where referral_code is null;

-- Apply a referral exactly once (atomic). Rewards both sides in credits.
create or replace function public.apply_referral(referee uuid, referrer uuid, reward int, bonus int)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare updated int;
begin
  if referee = referrer then return false; end if;

  update public.profiles
     set referred_by = referrer
   where id = referee and referred_by is null;
  get diagnostics updated = row_count;
  if updated = 0 then return false; end if;   -- already referred

  perform public.add_credits(referrer, reward, 'referral');
  perform public.add_credits(referee,  bonus,  'referral_bonus');
  return true;
end;
$$;

-- ---- Challenges (contests) ----
create table if not exists public.challenges (
  id         bigint generated always as identity primary key,
  title      text not null,
  brief      text,
  prize      text,                       -- e.g. "₦100,000 + 1000 credits"
  ends_at    timestamptz,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.challenge_entries (
  id           bigint generated always as identity primary key,
  challenge_id bigint references public.challenges(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  url          text,                      -- link to their post / asset
  status       text not null default 'pending',  -- pending | approved | winner | rejected
  created_at   timestamptz not null default now()
);

-- ---- Content rewards (post-with-link earns credits, manual review) ----
create table if not exists public.content_submissions (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  platform       text,                    -- tiktok | instagram | x | youtube
  url            text not null,
  status         text not null default 'pending',  -- pending | approved | rejected
  credits_awarded integer default 0,
  created_at     timestamptz not null default now()
);

-- ---- Affiliate cash payout requests (manual + KYC, anti-fraud) ----
create table if not exists public.payout_requests (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  amount_naira integer not null,
  bank_details text,
  status       text not null default 'requested', -- requested | paid | rejected | held
  created_at   timestamptz not null default now()
);

-- ---- RLS ----
alter table public.challenges          enable row level security;
alter table public.challenge_entries   enable row level security;
alter table public.content_submissions enable row level security;
alter table public.payout_requests     enable row level security;

drop policy if exists "challenges public read" on public.challenges;
create policy "challenges public read" on public.challenges for select using (true);

drop policy if exists "own entries" on public.challenge_entries;
create policy "own entries" on public.challenge_entries for select using (auth.uid() = user_id);

drop policy if exists "own content" on public.content_submissions;
create policy "own content" on public.content_submissions for select using (auth.uid() = user_id);

drop policy if exists "own payouts" on public.payout_requests;
create policy "own payouts" on public.payout_requests for select using (auth.uid() = user_id);

-- Users may create their own entries/submissions/payout requests.
drop policy if exists "insert own entries" on public.challenge_entries;
create policy "insert own entries" on public.challenge_entries for insert with check (auth.uid() = user_id);

drop policy if exists "insert own content" on public.content_submissions;
create policy "insert own content" on public.content_submissions for insert with check (auth.uid() = user_id);

drop policy if exists "insert own payouts" on public.payout_requests;
create policy "insert own payouts" on public.payout_requests for insert with check (auth.uid() = user_id);

-- A couple of demo challenges to start (edit/delete freely):
insert into public.challenges (title, brief, prize, ends_at)
select 'Fuse Launch Challenge', 'Create your best AI character with Fuse Studio and post it with #FuseStudio.', '₦100,000 + 1,000 credits', now() + interval '14 days'
where not exists (select 1 from public.challenges);

-- ===================== 3) PHASE 3 =========================
-- ============================================================
-- Fuse Studio — Phase 3 features
-- Naija packs (frontend only), daily streak, marketplace,
-- earn-while-you-learn, WhatsApp linking.
-- Run AFTER schema.sql and schema-phase2.sql. Safe to re-run.
-- ============================================================

alter table public.profiles
  add column if not exists last_claim_at      timestamptz,
  add column if not exists streak_days        integer not null default 0,
  add column if not exists learn_bonus_claimed boolean not null default false,
  add column if not exists wa_phone           text;

-- ---- Daily streak: 1 credit/day, +5 bonus every 7-day streak ----
create or replace function public.claim_daily(uid uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare last timestamptz; strk int; award int; bal int;
begin
  select last_claim_at, streak_days into last, strk from public.profiles where id = uid;

  -- already claimed in the last 20h?
  if last is not null and now() - last < interval '20 hours' then
    return jsonb_build_object('claimed', false, 'streak', strk);
  end if;

  -- continue streak if within 48h, else reset
  if last is not null and now() - last < interval '48 hours' then strk := strk + 1; else strk := 1; end if;

  award := 1;
  if strk % 7 = 0 then award := award + 5; end if;   -- weekly bonus

  update public.profiles set last_claim_at = now(), streak_days = strk where id = uid;
  bal := public.add_credits(uid, award, 'daily_streak');
  return jsonb_build_object('claimed', true, 'streak', strk, 'award', award, 'credits', bal);
end;
$$;

-- ---- Earn-while-you-learn: one-time bonus for finishing the lessons ----
create or replace function public.claim_learn_bonus(uid uuid, amount int)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare bal int; ok boolean;
begin
  update public.profiles set learn_bonus_claimed = true
   where id = uid and learn_bonus_claimed = false;
  get diagnostics ok = row_count;
  if ok = 0 then return jsonb_build_object('claimed', false); end if;
  bal := public.add_credits(uid, amount, 'learn_bonus');
  return jsonb_build_object('claimed', true, 'credits', bal);
end;
$$;

-- ---- Marketplace: creators publish presets, others use them ----
create table if not exists public.marketplace_presets (
  id         bigint generated always as identity primary key,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  prompt     text not null,
  model      text default 'flux-dev',
  aspect     text default '9:16',
  uses       integer not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.marketplace_presets enable row level security;
drop policy if exists "presets public read" on public.marketplace_presets;
create policy "presets public read" on public.marketplace_presets for select using (active = true);
drop policy if exists "insert own preset" on public.marketplace_presets;
create policy "insert own preset" on public.marketplace_presets for insert with check (auth.uid() = owner_id);

-- Record a use + reward the creator 1 credit (not for self-use).
create or replace function public.record_preset_use(pid bigint, by_user uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare owner uuid;
begin
  update public.marketplace_presets set uses = uses + 1 where id = pid returning owner_id into owner;
  if owner is not null and owner <> by_user then
    perform public.add_credits(owner, 1, 'preset_royalty');
  end if;
end;
$$;

-- ===================== 4) PHASE 4 =========================
-- ============================================================
-- Fuse Studio — Phase 4: AI Avatar Studio (consistent faces)
-- Upload a selfie -> we lock the identity -> generate you in any scene.
-- Run AFTER the earlier schema files. Safe to re-run.
-- ============================================================

-- ---- Saved avatars (one per uploaded face) ----
create table if not exists public.avatars (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  image_url  text not null,           -- public URL of the reference selfie
  status     text not null default 'ready',  -- ready | training | failed
  created_at timestamptz not null default now()
);

alter table public.avatars enable row level security;

drop policy if exists "own avatars read" on public.avatars;
create policy "own avatars read" on public.avatars for select using (auth.uid() = user_id);

drop policy if exists "own avatars insert" on public.avatars;
create policy "own avatars insert" on public.avatars for insert with check (auth.uid() = user_id);

drop policy if exists "own avatars delete" on public.avatars;
create policy "own avatars delete" on public.avatars for delete using (auth.uid() = user_id);

-- ---- Storage bucket for the uploaded selfies (public so the engine can read) ----
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatar files read" on storage.objects;
create policy "avatar files read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatar files upload" on storage.objects;
create policy "avatar files upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars');

drop policy if exists "avatar files delete" on storage.objects;
create policy "avatar files delete" on storage.objects
  for delete to authenticated using (bucket_id = 'avatars');
