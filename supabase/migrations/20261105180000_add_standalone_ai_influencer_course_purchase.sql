CREATE OR REPLACE FUNCTION public.fulfill_academy_purchase(p_user_id uuid, p_reference text, p_amount_naira integer, p_pack text, p_raw jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(processed boolean, payment_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  reserved_id bigint;
  course_keys text[];
begin
  if p_user_id is null or coalesce(trim(p_reference),'')='' or p_amount_naira<=0 then
    raise exception 'Invalid Academy purchase';
  end if;
  course_keys := case p_pack
    when 'academy-design' then array['flyer-m1','flyer-m2','flyer-m3','flyer-m4','flyer-m5','flyer-m6']
    when 'academy-video' then array['aiv-m1','aiv-m2','aiv-m3','aiv-m4','aiv-m5','aiv-m6','aiv-m7','aiv-m8','aiv-m9','aiv-m10','aiv-m11','aiv-m12','aiv-m13','aiv-m14','aiv-m15','aiv-m16']
    when 'academy-influencer' then array['ai-influencer-course']
    when 'academy-landing' then array['web-m1','web-m2','web-m3-current','web-m4','web-m5','web-m6','web-m7','web-m8','web-m9','web-m10']
    when 'academy-money' then array['money']
    when 'academy-challenge' then array['ai-video-client-challenge']
    when 'academy-ebook' then array['ai-video-business-guide']
    else null
  end;
  if course_keys is null then raise exception 'Unknown Academy product'; end if;
  if not exists(select 1 from public.profiles where id=p_user_id) then
    raise exception 'No Fuse profile';
  end if;

  insert into public.payments(user_id,reference,amount_naira,pack,credits_added,status,raw)
  values(p_user_id,p_reference,p_amount_naira,p_pack,0,'processing',coalesce(p_raw,'{}'::jsonb))
  on conflict(reference) do nothing returning id into reserved_id;

  if reserved_id is null then
    select status into payment_status from public.payments where reference=p_reference;
    processed:=false; return next; return;
  end if;

  insert into public.module_unlocks(user_id,module_key)
  select p_user_id,k from unnest(course_keys) k
  on conflict(user_id,module_key) do nothing;

  update public.payments set status='success',raw=coalesce(p_raw,'{}'::jsonb)
  where id=reserved_id;

  processed:=true; payment_status:='success'; return next;
end;
$function$;
revoke all on function public.fulfill_academy_purchase(uuid,text,integer,text,jsonb) from public,anon,authenticated;
grant execute on function public.fulfill_academy_purchase(uuid,text,integer,text,jsonb) to service_role;
