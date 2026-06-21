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
