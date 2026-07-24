-- ============================================================
-- Fuse Studio — Phase 31: make add_credits fail LOUDLY instead of silently.
--
-- Bug: `update profiles set credits = credits + amount where id = uid
-- returning credits into new_balance` does NOT raise an error if `uid`
-- matches zero rows (e.g. the profiles row doesn't exist yet at the moment
-- this runs) -- it just leaves new_balance NULL and returns normally.
-- paystack-webhook.js never checked that return value, so a payment could
-- go through on Paystack's side, the webhook could log a `payments` row
-- claiming success, and the buyer's actual balance would never move --
-- with zero errors anywhere to flag it. Same shape of bug existed in
-- spend_credits (silently doing nothing instead of signalling "no such
-- profile", though that one at least already returns NULL on insufficient
-- funds by design -- this migration only tightens the "no profile row"
-- case, not the legitimate insufficient-funds case).
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

  if new_balance is null then
    raise exception 'add_credits: no profiles row for uid %', uid;
  end if;

  insert into public.transactions (user_id, delta, reason)
  values (uid, amount, coalesce(why, 'purchase'));

  return new_balance;
end;
$$;
