-- Service-only atomic fulfillment shared by verified callback and signed webhook.
create or replace function public.fulfill_academy_bundle(p_user_id uuid,p_reference text,p_amount_naira integer,p_pack text,p_courses text[],p_raw jsonb default '{}'::jsonb)
returns table(processed boolean,payment_status text) language plpgsql security definer set search_path=public,pg_temp as $$
declare reserved_id bigint; wanted integer; expected integer; course text; unlocks text[] := '{}';
begin
 wanted:=case p_pack when 'academy-bundle-2' then 2 when 'academy-bundle-4' then 4 else 0 end;
 if p_courses is null or p_amount_naira is null or wanted=0 or cardinality(p_courses)<>wanted or (select count(distinct x) from unnest(p_courses)x)<>wanted or p_user_id is null or coalesce(trim(p_reference),'')='' then raise exception 'Invalid bundle'; end if;
 if exists(select 1 from unnest(p_courses)x where x not in ('design','video','landing','influencer','money','challenge') or x is null) then raise exception 'Invalid course';end if;
 select least(case wanted when 2 then 40000 else 75000 end,sum(case x when 'design' then 20000 when 'video' then 35000 when 'landing' then 30000 when 'influencer' then 30000 else 25000 end)) into expected from unnest(p_courses)x;
 if p_amount_naira<>expected then raise exception 'Invalid bundle price';end if;
 if not exists(select 1 from profiles where id=p_user_id) then raise exception 'No Fuse profile';end if;
 insert into payments(user_id,reference,amount_naira,pack,credits_added,status,raw) values(p_user_id,p_reference,p_amount_naira,p_pack,0,'processing',p_raw) on conflict(reference) do nothing returning id into reserved_id;
 if reserved_id is null then processed:=false;select status into payment_status from payments where reference=p_reference;return next;return;end if;
 foreach course in array p_courses loop
 unlocks:=unlocks || case course
 when 'design' then array(select 'flyer-m'||generate_series(1,6))
 when 'video' then array(select 'aiv-m'||generate_series(1,16))
 when 'landing' then array(select case when n=3 then 'web-m3-current' else 'web-m'||n end from generate_series(1,10)n)
 when 'money' then array['money'] when 'influencer' then array['ai-influencer-course'] when 'challenge' then array['ai-video-client-challenge'] end;
 end loop;
 insert into module_unlocks(user_id,module_key) select p_user_id,k from unnest(unlocks)k on conflict(user_id,module_key) do nothing;
 update payments set status='success' where id=reserved_id;
 processed:=true;payment_status:='success';return next;
end;$$;
revoke all on function public.fulfill_academy_bundle(uuid,text,integer,text,text[],jsonb) from public,anon,authenticated;
grant execute on function public.fulfill_academy_bundle(uuid,text,integer,text,text[],jsonb) to service_role;
