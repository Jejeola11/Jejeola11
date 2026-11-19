create or replace function public.fulfill_black_friday_bundle(
  p_user_id uuid, p_reference text, p_amount_naira integer, p_raw jsonb
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare payment_id bigint;
begin
  if p_user_id is null or nullif(trim(p_reference), '') is null or p_amount_naira is distinct from 15000 then
    raise exception 'Invalid Black Friday purchase';
  end if;

  insert into public.payments(user_id, reference, amount_naira, pack, credits_added, status, raw)
  values(p_user_id, p_reference, 15000, 'black-friday-creator-bundle', 100, 'success', p_raw)
  on conflict(reference) do nothing returning id into payment_id;
  if payment_id is null then return; end if;

  update public.profiles set credits = coalesce(credits, 0) + 100 where id = p_user_id;
  if not found then raise exception 'No Fuse profile'; end if;

  insert into public.transactions(user_id, delta, reason, meta)
  values(p_user_id, 100, 'purchase', jsonb_build_object('reference', p_reference, 'pack', 'black-friday-creator-bundle'));

  insert into public.module_unlocks(user_id, module_key)
  select p_user_id, key from unnest(array['ai-video-business-guide', 'ai-influencer-course', 'ai-video-client-challenge']) as keys(key)
  on conflict(user_id, module_key) do nothing;
end;
$$;
revoke all on function public.fulfill_black_friday_bundle(uuid,text,integer,jsonb) from public, anon, authenticated;
grant execute on function public.fulfill_black_friday_bundle(uuid,text,integer,jsonb) to service_role;
