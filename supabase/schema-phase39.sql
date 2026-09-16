-- ============================================================
-- Fuse Studio — Phase 39: atomic credit-pack fulfillment
--
-- One-time Fuse Atelier credit packs can be fulfilled by both the
-- Paystack webhook and the verified payment callback. This RPC makes
-- those two paths race-safe: the unique payment reference is reserved
-- and the credit grant + ledger + payment success happen in ONE DB
-- transaction. A retry with the same reference returns without adding
-- credits again.
-- ============================================================

create or replace function public.fulfill_credit_pack_purchase(
  p_user_id uuid,
  p_reference text,
  p_amount_naira integer,
  p_pack text,
  p_credits integer,
  p_raw jsonb default '{}'::jsonb
)
returns table(
  processed boolean,
  balance integer,
  payment_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  reserved_id bigint;
begin
  if p_user_id is null then
    raise exception 'fulfill_credit_pack_purchase: missing user id';
  end if;
  if coalesce(trim(p_reference),'') = '' then
    raise exception 'fulfill_credit_pack_purchase: missing reference';
  end if;
  if coalesce(trim(p_pack),'') = '' then
    raise exception 'fulfill_credit_pack_purchase: missing pack';
  end if;
  if p_credits is null or p_credits <= 0 then
    raise exception 'fulfill_credit_pack_purchase: invalid credits';
  end if;
  if p_amount_naira is null or p_amount_naira <= 0 then
    raise exception 'fulfill_credit_pack_purchase: invalid amount';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'fulfill_credit_pack_purchase: no profiles row for uid %', p_user_id;
  end if;

  insert into public.payments (
    user_id, reference, amount_naira, pack, credits_added, status, raw
  )
  values (
    p_user_id, p_reference, p_amount_naira, p_pack, 0, 'processing', coalesce(p_raw,'{}'::jsonb)
  )
  on conflict (reference) do nothing
  returning id into reserved_id;

  if reserved_id is null then
    select p.status into payment_status
    from public.payments p
    where p.reference = p_reference;

    select credits into balance
    from public.profiles
    where id = p_user_id;

    processed := false;
    return next;
    return;
  end if;

  update public.profiles
     set credits = credits + p_credits
   where id = p_user_id
   returning credits into balance;

  insert into public.transactions (user_id, delta, reason, meta)
  values (
    p_user_id,
    p_credits,
    'purchase',
    jsonb_build_object('reference', p_reference, 'pack', p_pack)
  );

  update public.payments
     set credits_added = p_credits,
         status = 'success',
         raw = coalesce(p_raw,'{}'::jsonb)
   where id = reserved_id;

  processed := true;
  payment_status := 'success';
  return next;
end;
$$;

revoke all on function public.fulfill_credit_pack_purchase(uuid,text,integer,text,integer,jsonb) from public;
revoke all on function public.fulfill_credit_pack_purchase(uuid,text,integer,text,integer,jsonb) from anon;
revoke all on function public.fulfill_credit_pack_purchase(uuid,text,integer,text,integer,jsonb) from authenticated;
grant execute on function public.fulfill_credit_pack_purchase(uuid,text,integer,text,integer,jsonb) to service_role;
