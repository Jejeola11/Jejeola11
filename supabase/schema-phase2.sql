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
