alter table public.jobs add column if not exists meta jsonb;
create or replace function public.higgsfield_reserve_job(p_request_id text,p_user_id uuid,p_credits integer)
returns integer language plpgsql security invoker set search_path=public as $$
declare j public.jobs%rowtype; b integer; adm boolean;
begin
 if p_credits<=0 or p_request_id not like 'hf:%' then raise exception 'Invalid reservation'; end if;
 select * into j from public.jobs where request_id=p_request_id and user_id=p_user_id for update;
 if not found or j.status<>'processing' or coalesce(j.meta->>'provider','')<>'higgsfield' then raise exception 'Job not found'; end if;
 if coalesce((j.meta->>'reserved')::boolean,false) then return (select credits from public.profiles where id=p_user_id); end if;
 select coalesce(is_admin,false) into adm from public.profiles where id=p_user_id;
 b:=public.spend_credits(p_user_id,p_credits);
 if b is null then return null; end if;
 update public.jobs set credits=p_credits,meta=coalesce(meta,'{}'::jsonb)||jsonb_build_object('reserved',true,'charged',not coalesce(adm,false)) where request_id=p_request_id;
 return b;
end; $$;
revoke all on function public.higgsfield_reserve_job(text,uuid,integer) from public,anon,authenticated;
grant execute on function public.higgsfield_reserve_job(text,uuid,integer) to service_role;
create or replace function public.higgsfield_fail_job(p_request_id text,p_message text)
returns boolean language plpgsql security invoker set search_path=public as $$
declare j public.jobs%rowtype;
begin
 select * into j from public.jobs where request_id=p_request_id for update;
 if not found or p_request_id not like 'hf:%' or coalesce(j.meta->>'provider','')<>'higgsfield' then raise exception 'Job not found'; end if;
 if j.status='failed' then return true; end if;
 if j.status<>'processing' then return false; end if;
 if coalesce((j.meta->>'charged')::boolean,false) and j.credits>0 then perform public.add_credits(j.user_id,j.credits,'refund'); end if;
 update public.jobs set status='failed',error_message=left(p_message,500),meta=coalesce(meta,'{}'::jsonb)||'{"refunded":true}'::jsonb where request_id=p_request_id;
 return true;
end; $$;
revoke all on function public.higgsfield_fail_job(text,text) from public,anon,authenticated;
grant execute on function public.higgsfield_fail_job(text,text) to service_role;
