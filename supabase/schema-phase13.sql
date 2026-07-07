-- ============================================================
-- Fuse Studio — Phase 13: Free trial credits weren't enough to cover ANY
--   video model (cheapest video = 15 credits, old trial = 12 credits), so
--   brand-new free members could only ever afford image generations even
--   though isLocked() already allowed them to pick video. Bumping the
--   signup trial to 25 credits fixes that, and this also tops up existing
--   free members who are still sitting on their untouched 12-credit trial
--   balance so today's already-affected members are fixed immediately.
-- Run after earlier files. Safe to re-run.
-- ============================================================

-- New signups from now on get 25 trial credits instead of 12.
alter table public.profiles alter column credits set default 25;

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

-- Top up existing free members who are still on the old, untouched
-- 12-credit trial balance (never bought a pack, never redeemed a code) —
-- so members who already joined and hit this bug are fixed right away.
update public.profiles
   set credits = credits + 13
 where plan = 'free'
   and credits = 12
   and not is_admin;

insert into public.transactions (user_id, delta, reason)
select id, 13, 'trial_topup'
  from public.profiles
 where plan = 'free'
   and credits = 25   -- just topped up above (was 12, now 25)
   and not is_admin
   and id not in (select user_id from public.transactions where reason = 'trial_topup');
