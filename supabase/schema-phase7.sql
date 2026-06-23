-- ============================================================
-- Fuse Studio — Phase 7: Founding offer (first 50 paying members = 2x credits)
-- Run AFTER the earlier schema files. Safe to re-run.
-- ============================================================
alter table public.profiles
  add column if not exists founding_2x boolean not null default false;

-- Atomically claim the founding bonus: returns true only for the first 50
-- distinct paying members, and only once per member. Change 50 to resize.
create or replace function public.claim_founding(uid uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare cnt int; updated int;
begin
  if (select founding_2x from public.profiles where id = uid) then
    return false;  -- already a founding member
  end if;
  select count(*) into cnt from public.profiles where founding_2x = true;
  if cnt >= 50 then return false; end if;   -- offer is full

  update public.profiles set founding_2x = true where id = uid and founding_2x = false;
  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;
