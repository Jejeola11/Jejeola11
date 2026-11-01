create or replace function public.fulfill_creator_pass(p_user_id uuid,p_reference text,p_amount_naira integer,p_raw jsonb default '{}'::jsonb)
returns table(processed boolean,payment_status text) language plpgsql security definer set search_path=public,pg_temp as $$
declare reserved_id bigint;
begin
 if p_user_id is null or coalesce(trim(p_reference),'')='' or p_amount_naira<>25900 then raise exception 'Invalid Creator Pass purchase'; end if;
 if not exists(select 1 from public.profiles where id=p_user_id) then raise exception 'No Fuse profile'; end if;
 insert into public.payments(user_id,reference,amount_naira,pack,credits_added,status,raw)
 values(p_user_id,p_reference,25900,'fuse-creator-pass',0,'processing',coalesce(p_raw,'{}')) on conflict(reference) do nothing returning id into reserved_id;
 if reserved_id is null then processed:=false;select status into payment_status from public.payments where reference=p_reference;return next;return;end if;
 update public.profiles set credits=coalesce(credits,0)+55 where id=p_user_id;
 insert into public.transactions(user_id,delta,reason,meta) values(p_user_id,55,'purchase',jsonb_build_object('reference',p_reference,'pack','fuse-creator-pass'));
 insert into public.module_unlocks(user_id,module_key)
 select p_user_id,k from unnest(array['atelier-full','money','money-m1','money-m2','money-m3','ai-video-client-challenge','ai-video-business-guide'] || array(select 'flyer-m'||generate_series(1,6)) || array(select 'aiv-m'||generate_series(1,16)) || array(select case when n=3 then 'web-m3-current' else 'web-m'||n end from generate_series(1,10)n))k on conflict(user_id,module_key) do nothing;
 update public.payments set credits_added=55,status='success' where id=reserved_id;
 processed:=true;payment_status:='success';return next;
end;$$;
revoke all on function public.fulfill_creator_pass(uuid,text,integer,jsonb) from public,anon,authenticated;
grant execute on function public.fulfill_creator_pass(uuid,text,integer,jsonb) to service_role;