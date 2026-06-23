-- ============================================================
-- Fuse Studio — Phase 8: Admin account (unlimited, all plans, no payment)
-- Run AFTER the earlier schema files. Safe to re-run.
--
-- 👉 Set YOUR_EMAIL below to the email you sign in with on Fuse Studio.
-- ============================================================

-- 1) Admin flag
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- 2) Credit spending bypasses deduction for admins (unlimited generations)
create or replace function public.spend_credits(uid uuid, amount integer)
returns integer
language plpgsql security definer set search_path = public
as $$
declare new_balance integer; is_adm boolean;
begin
  select is_admin into is_adm from public.profiles where id = uid;
  if is_adm then
    -- unlimited: never deduct, just report the (big) balance
    return (select credits from public.profiles where id = uid);
  end if;

  update public.profiles
     set credits = credits - amount
   where id = uid and credits >= amount
   returning credits into new_balance;
  if new_balance is null then return null; end if;

  insert into public.transactions (user_id, delta, reason)
  values (uid, -amount, 'generation');
  return new_balance;
end;
$$;

-- 3) Make the owner an admin: unlimited credits + top plan, never expires.
--    Change the email on BOTH lines to the one you log in with.
update public.profiles
   set is_admin = true, credits = 9999999, plan = 'agency',
       plan_expires_at = now() + interval '100 years'
 where email = 'riadigitals0@gmail.com';

-- (covers the case where profiles.email wasn't filled — match via auth.users)
update public.profiles p
   set is_admin = true, credits = 9999999, plan = 'agency',
       plan_expires_at = now() + interval '100 years'
  from auth.users u
 where u.id = p.id and u.email = 'riadigitals0@gmail.com';
